from __future__ import annotations
"""
Lusha contact reveal — phone/email por crédito.
Cache permanente en DB: una vez revelado, nunca se vuelve a cobrar.
Usa v1/person endpoint para búsqueda inicial de contactos.
"""

import logging
import uuid
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger(__name__)

LUSHA_V1_PERSON_URL = "https://api.lusha.com/v1/person"
_TIMEOUT = 15.0
_MAX_RETRIES = 3


def _headers() -> dict[str, str]:
    return {
        "api_key": get_settings().lusha_api_key,
        "Content-Type": "application/json",
    }


async def reveal_contact(
    contact_id: int,
    linkedin_url: str | None,
    full_name: str | None,
    company_name: str | None,
) -> dict[str, Any]:
    """
    Reveal phone/email for a contact via Lusha API v1.
    Uses firstName/lastName/company lookup.
    Cache permanente en DB: una vez revelado, nunca se vuelve a cobrar.

    Returns:
        {
            "phone": str | None,
            "email": str | None,
            "cached": bool,
            "revealed_at": str | None,
        }

    Raises:
        ValueError if LUSHA_API_KEY is not configured.
    """
    from database import get_conn  # local import avoids circular dep at module level

    request_id = str(uuid.uuid4())[:8]
    log = logger.getChild(f"req:{request_id}")

    settings = get_settings()
    if not settings.lusha_api_key:
        raise ValueError("LUSHA_API_KEY no configurada")

    # ── 1. Cache check ────────────────────────────────────────────────────────
    async with get_conn() as conn:
        cursor = await conn.execute(
            "SELECT revealed_phone, revealed_email, revealed_at FROM lu_contacts WHERE id = ?",
            (contact_id,),
        )
        row = await cursor.fetchone()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    if row["revealed_phone"] or row["revealed_email"]:
        log.info("contact_id=%s cache_hit=true", contact_id)
        return {
            "phone": row["revealed_phone"],
            "email": row["revealed_email"],
            "cached": True,
            "revealed_at": row["revealed_at"],
        }

    # ── 2. Parse full_name into firstName and lastName ───────────────────────
    if not full_name and not linkedin_url:
        raise ValueError("Se necesita full_name o linkedin_url para revelar contacto")

    first_name = ""
    last_name = ""
    if full_name:
        parts = full_name.strip().split(None, 1)  # Split on first whitespace
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    # ── 3. Build query params for v1/person ────────────────────────────────────
    params: dict[str, str] = {}
    if linkedin_url:
        params["linkedinUrl"] = linkedin_url
    else:
        if first_name:
            params["firstName"] = first_name
        if last_name:
            params["lastName"] = last_name
        if company_name:
            params["company"] = company_name

    if not params:
        raise ValueError("Se necesita firstName o linkedinUrl para revelar contacto")

    log.info("contact_id=%s lusha_reveal=start params=%s", contact_id, list(params.keys()))

    # ── 4. Call Lusha v1/person API ────────────────────────────────────────────
    last_exc: Exception | None = None
    data: dict[str, Any] = {}

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.get(LUSHA_V1_PERSON_URL, params=params, headers=_headers())

            if resp.status_code == 404:
                log.warning("contact_id=%s lusha=404 contact_not_found", contact_id)
                return {"phone": None, "email": None, "cached": False, "revealed_at": None}

            if resp.status_code == 402:
                log.error("contact_id=%s lusha=402 no_credits", contact_id)
                from fastapi import HTTPException
                raise HTTPException(status_code=402, detail="Sin créditos Lusha disponibles")

            if resp.status_code >= 400:
                body = resp.text[:500]
                log.error("contact_id=%s lusha_error status=%s body=%s", contact_id, resp.status_code, body)
                resp.raise_for_status()

            data = resp.json()
            log.info("contact_id=%s lusha=ok attempt=%s data_keys=%s", contact_id, attempt, list(data.keys()))
            break

        except httpx.TimeoutException as exc:
            last_exc = exc
            log.warning("contact_id=%s lusha=timeout attempt=%s/%s", contact_id, attempt, _MAX_RETRIES)
            if attempt == _MAX_RETRIES:
                raise RuntimeError(
                    f"Lusha timeout tras {_MAX_RETRIES} intentos para contact_id={contact_id}"
                ) from exc
        except httpx.HTTPStatusError:
            if attempt == _MAX_RETRIES:
                raise

    # ── 5. Parse response (Lusha v1 returns person object directly) ────────────
    phone: str | None = None
    email: str | None = None

    # v1/person response: { phone: "...", email: "...", ... }
    phone = data.get("phone")
    email = data.get("email")

    # ── 6. Persist to DB (cache permanently) ────────────────────────────────
    async with get_conn() as conn:
        await conn.execute(
            """
            UPDATE lu_contacts
            SET revealed_phone = ?,
                revealed_email = ?,
                revealed_at    = datetime('now')
            WHERE id = ?
            """,
            (phone, email, contact_id),
        )
        await conn.commit()

        cursor = await conn.execute(
            "SELECT revealed_phone, revealed_email, revealed_at FROM lu_contacts WHERE id = ?",
            (contact_id,),
        )
        saved = await cursor.fetchone()

    log.info("contact_id=%s phone_found=%s email_found=%s saved=true", contact_id, bool(phone), bool(email))

    return {
        "phone": saved["revealed_phone"],
        "email": saved["revealed_email"],
        "cached": False,
        "revealed_at": saved["revealed_at"],
    }

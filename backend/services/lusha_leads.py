from __future__ import annotations
import logging
from typing import Optional
import httpx
from config import get_settings

logger = logging.getLogger(__name__)

# ── Flip to False when ready to use real Lusha credits ──────────────────────
MOCK_MODE = False

LUSHA_BASE = "https://api.lusha.com"
SEARCH_URL = f"{LUSHA_BASE}/v2/prospecting/contact/search"
REVEAL_URL = f"{LUSHA_BASE}/v1/contact"

# ---------------------------------------------------------------------------
# Mock data — fictitious construction/reform companies (Acme-style placeholders).
# Used only when MOCK_MODE = True. All values are SYNTHETIC.
# ---------------------------------------------------------------------------
_MOCK_LEADS = [
    {"company_name": "Acme Renovations Ltd", "company_city": "Springfield", "company_website": "acme-renovations.example", "contact_name": "Alex Doe", "contact_title": "Manager", "contact_email": "alex@example.com", "phone_prefix": "691", "is_mobile": True},
    {"company_name": "Globex Construction Co", "company_city": "Riverside", "company_website": "globex-construction.example", "contact_name": "Sam Roe", "contact_title": "General Manager", "contact_email": "sam@example.com", "phone_prefix": "656", "is_mobile": True},
    {"company_name": "Initech Interiors", "company_city": "Lakeview", "company_website": "initech-interiors.example", "contact_name": "Jordan Poe", "contact_title": "CEO", "contact_email": "jordan@example.com", "phone_prefix": "722", "is_mobile": True},
    {"company_name": "Umbrella Builders Inc", "company_city": "Hill Valley", "company_website": "umbrella-builders.example", "contact_name": "Taylor Loe", "contact_title": "Owner", "contact_email": "taylor@example.com", "phone_prefix": "677", "is_mobile": True},
    {"company_name": "Stark Industrial Works", "company_city": "Metropolis", "company_website": "stark-industrial.example", "contact_name": "Casey Moe", "contact_title": "Founder", "contact_email": "casey@example.com", "phone_prefix": "634", "is_mobile": True},
]


def _headers() -> dict:
    return {
        "api_key": get_settings().lusha_api_key,
        "Content-Type": "application/json",
    }


def _is_mobile_prefix(phone_str: str) -> bool:
    """Detect Spanish mobile: starts with 6, 7, or +34 followed by 6/7."""
    if not phone_str:
        return False
    cleaned = phone_str.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+34"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0034"):
        cleaned = cleaned[4:]
    elif cleaned.startswith("34") and len(cleaned) == 11:
        cleaned = cleaned[2:]
    return cleaned.startswith("6") or cleaned.startswith("7")


def _mask_phone(prefix: str) -> str:
    """Turn 3-digit prefix into display string: '6XX XXX XXX'."""
    if not prefix:
        return "6XX XXX XXX"
    p = prefix.strip()
    return f"{p}X XXX XXX"


async def search_construction_leads(count: int = 25) -> list[dict]:
    if MOCK_MODE:
        logger.info(f"[MOCK] Returning {min(count, len(_MOCK_LEADS))} mock leads (no Lusha credit spent)")
        return [
            {**lead, "lusha_person_id": f"mock_{i+1}", "phone_revealed": False, "company_industry": "Construcción / Reformas"}
            for i, lead in enumerate(_MOCK_LEADS[:count])
        ]
    """
    Search Lusha for Spanish construction/reform company contacts.
    Returns list of dicts with company + contact info.
    """
    settings = get_settings()
    if not settings.lusha_api_key:
        raise ValueError("LUSHA_API_KEY not configured")

    payload = {
        "filter": {
            "countries": ["ES"],
            "jobTitles": [
                "CEO", "Director", "Gerente", "Propietario",
                "Owner", "Founder", "Managing Director"
            ],
            "industries": [
                "Construction", "Real Estate", "Architecture & Planning"
            ],
        },
        "page": 1,
        "pageSize": count,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(SEARCH_URL, headers=_headers(), json=payload)

    if resp.status_code == 402:
        raise RuntimeError("Lusha: créditos insuficientes o plan no permite prospecting")
    if resp.status_code == 401:
        raise RuntimeError("Lusha: API key inválida")
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Lusha search error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    contacts_raw = data.get("contacts", data.get("data", []))

    results = []
    for c in contacts_raw:
        # Extract phone prefix (Lusha free tier gives first 3 digits)
        phone_data = c.get("phone", c.get("mobilePhone", {}))
        if isinstance(phone_data, dict):
            raw_phone = phone_data.get("rawNumber", phone_data.get("number", ""))
        else:
            raw_phone = str(phone_data) if phone_data else ""

        prefix = raw_phone[:3] if raw_phone else ""
        is_mobile = _is_mobile_prefix(raw_phone) if raw_phone else False

        company_data = c.get("company", c.get("organization", {}))
        company_name = company_data.get("name", c.get("companyName", "")) if isinstance(company_data, dict) else str(company_data)
        company_domain = company_data.get("domain", company_data.get("website", "")) if isinstance(company_data, dict) else ""

        email_data = c.get("email", {})
        email = email_data.get("email", "") if isinstance(email_data, dict) else str(email_data or "")

        results.append({
            "lusha_person_id": str(c.get("id", c.get("personId", ""))),
            "contact_name": f"{c.get('firstName', '')} {c.get('lastName', '')}".strip(),
            "contact_title": c.get("jobTitle", c.get("title", "")),
            "contact_email": email,
            "phone_prefix": prefix,
            "phone_revealed": False,
            "is_mobile": is_mobile,
            "company_name": company_name,
            "company_website": company_domain,
            "company_city": _extract_city(c),
            "company_industry": "Construcción / Reformas",
        })

    return results


def _extract_city(contact: dict) -> str:
    loc = contact.get("location", contact.get("address", {}))
    if isinstance(loc, dict):
        return loc.get("city", loc.get("locality", "España"))
    return "España"


async def reveal_phone(lusha_person_id: str) -> Optional[str]:
    if MOCK_MODE:
        # Deterministic: mismos dígitos siempre para el mismo contacto
        import hashlib
        seed = int(hashlib.md5(lusha_person_id.encode()).hexdigest(), 16)
        prefix = lusha_person_id.replace("mock_", "")[:3] if lusha_person_id.startswith("mock_") else "6"
        d = [(seed >> (i * 4)) % 10 for i in range(6)]
        phone = f"+34 {prefix} {''.join(map(str,d[:3]))} {''.join(map(str,d[3:]))}"
        logger.info(f"[MOCK] Reveal phone for {lusha_person_id}: {phone} (deterministic, no Lusha credit)")
        return phone
    """
    Call Lusha to reveal full phone number for a contact.
    This costs a Lusha credit.
    Returns the full phone number string or None.
    """
    settings = get_settings()
    if not settings.lusha_api_key:
        raise ValueError("LUSHA_API_KEY not configured")

    url = f"{REVEAL_URL}?personId={lusha_person_id}&properties=phone"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=_headers())

    if resp.status_code == 402:
        raise RuntimeError("Lusha: sin créditos para revelar teléfono")
    if resp.status_code == 401:
        raise RuntimeError("Lusha: API key inválida")
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Lusha reveal error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    # Try multiple response shapes Lusha may return
    phone = (
        data.get("phone", {}).get("rawNumber")
        or data.get("mobilePhone", {}).get("rawNumber")
        or data.get("data", {}).get("phone", {}).get("rawNumber")
        or data.get("phoneNumbers", [None])[0]
    )
    return phone

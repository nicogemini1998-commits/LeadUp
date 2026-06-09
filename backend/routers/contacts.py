from __future__ import annotations
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import get_conn
from services.lusha_client import reveal_contact

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


@router.patch("/{contact_id}")
async def update_contact(
    contact_id: int,
    body: ContactUpdate,
    current_user: dict = Depends(get_current_user),
):
    async with get_conn() as conn:
        cursor = await conn.execute(
            "SELECT id FROM lu_contacts WHERE id = ?",
            (contact_id,),
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Contacto no encontrado")

        updates = {k: v for k, v in body.model_dump().items() if v is not None}

        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            await conn.execute(
                f"UPDATE lu_contacts SET {set_clause} WHERE id = ?",
                [*updates.values(), contact_id],
            )
            await conn.commit()

        cursor = await conn.execute(
            "SELECT id, name, title, phone, email FROM lu_contacts WHERE id = ?",
            (contact_id,),
        )
        row = await cursor.fetchone()

    return {
        "id": row["id"],
        "name": row["name"],
        "title": row["title"],
        "phone": row["phone"],
        "email": row["email"],
    }


class RevealRequest(BaseModel):
    linkedin_url: Optional[str] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None


@router.post("/{contact_id}/reveal-phone")
async def reveal_phone(
    contact_id: int,
    body: RevealRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Reveal phone/email for a contact via Lusha.
    Result is cached permanently — Lusha credit only charged once per contact.
    """
    logger.info(
        "reveal_phone contact_id=%s user_id=%s linkedin=%s",
        contact_id,
        current_user["id"],
        bool(body.linkedin_url),
    )

    try:
        result = await reveal_contact(
            contact_id=contact_id,
            linkedin_url=body.linkedin_url,
            full_name=body.full_name,
            company_name=body.company_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {
        "success": True,
        "data": {
            "phone": result["phone"],
            "email": result["email"],
            "cached": result["cached"],
            "revealed_at": result["revealed_at"],
        },
    }

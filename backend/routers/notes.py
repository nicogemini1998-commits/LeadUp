from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import get_conn

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteUpdate(BaseModel):
    notes: str


@router.patch("/{assignment_id}")
async def update_notes(
    assignment_id: int,
    body: NoteUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update notes for a lead assignment."""
    async with get_conn() as conn:
        cursor = await conn.execute(
            "SELECT id, user_id FROM lu_daily_assignments WHERE id = ?",
            (assignment_id,),
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")

        if current_user["role"] != "admin" and row["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar este lead")

        await conn.execute(
            "UPDATE lu_daily_assignments SET notes = ? WHERE id = ?",
            (body.notes, assignment_id),
        )
        await conn.commit()

        cursor = await conn.execute(
            "SELECT id, notes FROM lu_daily_assignments WHERE id = ?",
            (assignment_id,),
        )
        updated = await cursor.fetchone()

    return {"assignment_id": updated["id"], "notes": updated["notes"]}


@router.get("/{assignment_id}")
async def get_notes(
    assignment_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get notes for a lead assignment."""
    async with get_conn() as conn:
        cursor = await conn.execute(
            """
            SELECT da.id, da.notes, da.user_id, c.name AS company_name
            FROM lu_daily_assignments da
            JOIN lu_companies c ON da.company_id = c.id
            WHERE da.id = ?
            """,
            (assignment_id,),
        )
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    if current_user["role"] != "admin" and row["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Sin permiso")

    return {"assignment_id": row["id"], "company_name": row["company_name"], "notes": row["notes"]}

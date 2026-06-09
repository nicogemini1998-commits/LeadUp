from __future__ import annotations
"""
CRUD de recordatorios por assignment.
Tabla: lu_reminders (creada con ADD COLUMN fallback si no existe).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import get_conn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assignments", tags=["reminders"])


# ── Schema ─────────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    text: str
    due_at: Optional[str] = None   # ISO datetime string, optional


class ReminderUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    due_at: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _assert_assignment_access(conn, assignment_id: int, user: dict) -> None:
    """Raise 404 if assignment doesn't exist, 403 if user has no access."""
    cursor = await conn.execute(
        "SELECT id, user_id FROM lu_daily_assignments WHERE id = ?",
        (assignment_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    if user["role"] != "admin" and row["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Sin permiso para esta asignación")


def _row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "assignment_id": row["assignment_id"],
        "text": row["text"],
        "due_at": row["due_at"],
        "done": bool(row["done"]),
        "position": row["position"],
        "created_at": row["created_at"],
    }


# ── Ensure table exists (idempotent) ──────────────────────────────────────────

async def _ensure_table(conn) -> None:
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS lu_reminders (
            id            SERIAL PRIMARY KEY,
            assignment_id INTEGER NOT NULL REFERENCES lu_daily_assignments(id) ON DELETE CASCADE,
            text          TEXT    NOT NULL,
            due_at        TEXT,
            done          INTEGER NOT NULL DEFAULT 0,
            position      INTEGER NOT NULL DEFAULT 0,
            created_at    TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_assignment ON lu_reminders(assignment_id)"
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/{assignment_id}/reminders")
async def list_reminders(
    assignment_id: int,
    current_user: dict = Depends(get_current_user),
):
    """List all reminders for an assignment, ordered by position then created_at."""
    async with get_conn() as conn:
        await _ensure_table(conn)
        await _assert_assignment_access(conn, assignment_id, current_user)

        cursor = await conn.execute(
            """
            SELECT id, assignment_id, text, due_at, done, position, created_at
            FROM lu_reminders
            WHERE assignment_id = ?
            ORDER BY position ASC, created_at ASC
            """,
            (assignment_id,),
        )
        rows = await cursor.fetchall()

    return {"assignment_id": assignment_id, "reminders": [_row_to_dict(r) for r in rows]}


@router.post("/{assignment_id}/reminders", status_code=201)
async def create_reminder(
    assignment_id: int,
    body: ReminderCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new reminder for an assignment."""
    async with get_conn() as conn:
        await _ensure_table(conn)
        await _assert_assignment_access(conn, assignment_id, current_user)

        # Auto-position: last + 1
        cursor = await conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM lu_reminders WHERE assignment_id = ?",
            (assignment_id,),
        )
        pos_row = await cursor.fetchone()
        position = pos_row["next_pos"] if pos_row else 0

        cursor = await conn.execute(
            """
            INSERT INTO lu_reminders (assignment_id, text, due_at, position)
            VALUES (?, ?, ?, ?)
            """,
            (assignment_id, body.text, body.due_at, position),
        )
        await conn.commit()
        new_id = cursor.lastrowid

        cursor = await conn.execute(
            "SELECT id, assignment_id, text, due_at, done, position, created_at FROM lu_reminders WHERE id = ?",
            (new_id,),
        )
        row = await cursor.fetchone()

    logger.info("reminder created id=%s assignment_id=%s user_id=%s", new_id, assignment_id, current_user["id"])
    return _row_to_dict(row)


@router.patch("/{assignment_id}/reminders/{reminder_id}")
async def update_reminder(
    assignment_id: int,
    reminder_id: int,
    body: ReminderUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Edit text, done state, or due_at of a reminder."""
    async with get_conn() as conn:
        await _ensure_table(conn)
        await _assert_assignment_access(conn, assignment_id, current_user)

        cursor = await conn.execute(
            "SELECT id FROM lu_reminders WHERE id = ? AND assignment_id = ?",
            (reminder_id, assignment_id),
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Recordatorio no encontrado")

        updates: dict = {}
        if body.text is not None:
            updates["text"] = body.text
        if body.done is not None:
            updates["done"] = int(body.done)
        if body.due_at is not None:
            updates["due_at"] = body.due_at

        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            await conn.execute(
                f"UPDATE lu_reminders SET {set_clause} WHERE id = ?",
                [*updates.values(), reminder_id],
            )
            await conn.commit()

        cursor = await conn.execute(
            "SELECT id, assignment_id, text, due_at, done, position, created_at FROM lu_reminders WHERE id = ?",
            (reminder_id,),
        )
        row = await cursor.fetchone()

    return _row_to_dict(row)


@router.delete("/{assignment_id}/reminders/{reminder_id}", status_code=204)
async def delete_reminder(
    assignment_id: int,
    reminder_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a reminder."""
    async with get_conn() as conn:
        await _ensure_table(conn)
        await _assert_assignment_access(conn, assignment_id, current_user)

        cursor = await conn.execute(
            "SELECT id FROM lu_reminders WHERE id = ? AND assignment_id = ?",
            (reminder_id, assignment_id),
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Recordatorio no encontrado")

        await conn.execute("DELETE FROM lu_reminders WHERE id = ?", (reminder_id,))
        await conn.commit()

    logger.info("reminder deleted id=%s assignment_id=%s user_id=%s", reminder_id, assignment_id, current_user["id"])
    return None

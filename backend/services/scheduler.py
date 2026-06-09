from __future__ import annotations
"""
Scheduler de asignación de leads — asignación MANUAL vía /api/admin/assign-now.
Sin jobs automáticos.
"""

import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import get_settings
from database import get_conn

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def assign_leads_for_user(user_id: int, assign_date: date | str, count: int = 20, industry_override: str | None = None) -> int:
    """
    Asigna hasta `count` empresas sin asignar al usuario dado para la fecha dada.
    Si industry_override se especifica, filtra solo ese nicho (ignora industry_filters del usuario).
    Retorna el número de leads asignados.
    """
    if isinstance(assign_date, str):
        assign_date = date.fromisoformat(assign_date)

    date_str = assign_date.isoformat()

    async with get_conn() as conn:
        # Empresas ya asignadas al usuario ese día (evitar duplicados)
        cursor = await conn.execute(
            """
            SELECT company_id FROM lu_daily_assignments
            WHERE user_id = ? AND assigned_date = ?
            """,
            (user_id, date_str),
        )
        already = {row["company_id"] for row in await cursor.fetchall()}

        # Obtener filtros de industria del usuario
        cursor = await conn.execute(
            "SELECT industry_filters FROM lu_users WHERE id = ?", (user_id,)
        )
        user_row = await cursor.fetchone()
        if not user_row:
            logger.warning(f"assign_leads_for_user: usuario {user_id} no encontrado")
            return 0

        import json as _json
        if industry_override:
            industry_filters: list[str] = [industry_override]
        else:
            industry_filters = []
            raw = user_row.get("industry_filters") if user_row else None
            if raw:
                try:
                    industry_filters = _json.loads(raw) if isinstance(raw, str) else raw
                except Exception:
                    industry_filters = []

        # Seleccionar empresas candidatas: no asignadas a nadie hoy, activas
        if industry_filters:
            placeholders = ",".join(["?" for _ in industry_filters])
            cursor = await conn.execute(
                f"""
                SELECT c.id FROM lu_companies c
                WHERE 1=1
                  AND c.id NOT IN (
                      SELECT company_id FROM lu_daily_assignments
                  )
                  AND c.industry IN ({placeholders})
                ORDER BY RANDOM()
                LIMIT ?
                """,
                (*industry_filters, count),
            )
        else:
            cursor = await conn.execute(
                """
                SELECT c.id FROM lu_companies c
                WHERE 1=1
                  AND c.id NOT IN (
                      SELECT company_id FROM lu_daily_assignments
                  )
                ORDER BY RANDOM()
                LIMIT ?
                """,
                (count,),
            )

        candidates = [row["id"] for row in await cursor.fetchall()]
        # Excluir los ya asignados al usuario (defensivo)
        candidates = [c for c in candidates if c not in already]

        if not candidates:
            logger.info(f"No hay leads disponibles para usuario {user_id} en {date_str}")
            return 0

        assigned = 0
        for company_id in candidates:
            await conn.execute(
                """
                INSERT INTO lu_daily_assignments (user_id, company_id, assigned_date, status)
                VALUES (?, ?, ?, 'pending')
                """,
                (user_id, company_id, date_str),
            )
            assigned += 1

        logger.info(f"Asignados {assigned} leads al usuario {user_id} para {date_str}")
        return assigned


async def trigger_manual_assignment() -> dict:
    """Dispara asignación inmediata para todos los comerciales activos con lead_search_enabled."""
    settings = get_settings()
    today = date.today()
    results: dict[int, int] = {}

    async with get_conn() as conn:
        cursor = await conn.execute(
            """
            SELECT id, name, COALESCE(leads_per_day, ?) AS leads_per_day
            FROM lu_users
            WHERE role = 'commercial' AND lead_search_enabled = TRUE
            """,
            (settings.leads_per_user_per_day,),
        )
        users = await cursor.fetchall()

    for user in users:
        count = await assign_leads_for_user(user["id"], today, user["leads_per_day"])
        results[user["id"]] = count
        logger.info(f"[trigger_manual] {user['name']}: {count} leads asignados")

    return {"date": today.isoformat(), "assigned_per_user": results}


def get_scheduler() -> AsyncIOScheduler:
    """Scheduler sin jobs automáticos — asignación solo manual vía /api/admin/assign-now."""
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="Europe/Madrid")
        logger.info("Scheduler iniciado — sin jobs automáticos (asignación manual)")
    return _scheduler

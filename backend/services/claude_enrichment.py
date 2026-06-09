from __future__ import annotations
"""
Sales intelligence con Claude Haiku.
Cache 30 días en companies.enrichment (JSONB simulado en SQLite TEXT).
MOCK_MODE: genera inteligencia realista sin gastar créditos.
"""

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import anthropic

from config import get_settings

logger = logging.getLogger(__name__)

_CACHE_DAYS = 30
MOCK_MODE = False  # Claude Haiku activo

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    return _client


def _mock_enrichment(company_name: str, industry: str | None, notes: str | None) -> dict[str, Any]:
    """Mock sales intelligence — realistic output without API calls."""
    industry = industry or "sector desconocido"
    
    return {
        "hooks": [
            f"En empresas como {company_name}, los equipos comerciales pierden un 40% de presupuestos por falta de seguimiento automático.",
            f"{company_name}, ¿cuál es vuestro principal desafío ahora mismo: captar más leads o convertir mejor los que ya tenéis?",
            f"Acabo de analizar el Digital Score de {company_name} en mi sistema y tenéis oportunidad inmediata en 3 canales.",
        ],
        "opening_lines": [
            f"Hola, soy comercial de [YOUR COMPANY]. Acabo de ver que {company_name} tiene presencia en Google pero sin videocasos de éxito. ¿Podemos hablar 15 minutos?",
            f"He analizado la estrategia digital de {company_name} y creo que le falta un sistema de captación online estructurado. ¿Interesa escuchar qué hacen tus competidores?",
            f"Contacto porque {company_name} tiene todo para crecer en ventas pero le está fallando el embudo digital. ¿Hablamos?",
        ],
        "call_to_action": [
            "¿Podemos agendar 20 minutos esta semana para un diagnóstico rápido de tu Digital Score?",
            "Me gustaría hacer una auditoría express de tus canales digitales. ¿Mañana o pasado a las 11?",
            "Tengo un slot libre el jueves para mostrar cómo empresas como la vuestra han aumentado leads en 60 días. ¿Te interesa?",
        ],
        "opportunity_summary": f"{company_name} es una empresa consolidada en {industry} con claro potencial de crecimiento mediante digitalización. Su mayor oportunidad está en estructurar un sistema de captación online que complemente su actual dependencia de referencias.",
    }


async def enrich_company(
    company_id: int,
    company_name: str,
    industry: str | None,
    notes: str | None,
) -> dict[str, Any]:
    """
    Genera hooks, opening lines y CTAs para una empresa usando Claude Haiku.
    Cache de 30 días: si existe enriquecimiento reciente, lo devuelve sin llamar a la API.

    Returns:
        {
            "enrichment": dict,
            "cached": bool,
            "enriched_at": str | None,
        }
    """
    from database import get_conn  # local import avoids circular dep

    request_id = str(uuid.uuid4())[:8]
    log = logger.getChild(f"req:{request_id}")

    settings = get_settings()
    if not MOCK_MODE and not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY no configurada")

    # ── 1. Cache check ────────────────────────────────────────────────────────
    async with get_conn() as conn:
        cursor = await conn.execute(
            "SELECT enrichment, enriched_at FROM lu_companies WHERE id = ?",
            (company_id,),
        )
        row = await cursor.fetchone()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if row["enrichment"] and row["enriched_at"]:
        try:
            enriched_dt = datetime.fromisoformat(row["enriched_at"])
            age = datetime.now(timezone.utc) - enriched_dt.replace(tzinfo=timezone.utc)
            if age < timedelta(days=_CACHE_DAYS):
                log.info("company_id=%s cache_hit=true age_days=%s", company_id, age.days)
                return {
                    "enrichment": json.loads(row["enrichment"]),
                    "cached": True,
                    "enriched_at": row["enriched_at"],
                }
        except (ValueError, TypeError):
            pass  # malformed date → fall through to re-enrich

    # ── 2. Generate enrichment (Mock or Claude) ──────────────────────────────
    log.info("company_id=%s enrich=start name=%r industry=%r mock=%s", company_id, company_name, industry, MOCK_MODE)

    if MOCK_MODE:
        enrichment = _mock_enrichment(company_name, industry, notes)
    else:
        prompt = _build_prompt(company_name, industry, notes)
        client = _get_client()
        message = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1]
            raw = raw.rsplit("```", 1)[0].strip()

        try:
            enrichment = json.loads(raw)
        except json.JSONDecodeError as exc:
            log.error("company_id=%s claude_json_parse_error=%s raw=%r", company_id, exc, raw[:200])
            raise ValueError(f"Claude devolvió JSON inválido: {exc}") from exc

    log.info("company_id=%s enrich=ok keys=%s", company_id, list(enrichment.keys()))

    # ── 3. Persist ────────────────────────────────────────────────────────────
    async with get_conn() as conn:
        await conn.execute(
            """
            UPDATE lu_companies
            SET enrichment  = ?,
                enriched_at = datetime('now')
            WHERE id = ?
            """,
            (json.dumps(enrichment), company_id),
        )
        await conn.commit()

        cursor = await conn.execute(
            "SELECT enriched_at FROM lu_companies WHERE id = ?",
            (company_id,),
        )
        saved = await cursor.fetchone()

    return {
        "enrichment": enrichment,
        "cached": False,
        "enriched_at": saved["enriched_at"],
    }


def _build_prompt(company_name: str, industry: str | None, notes: str | None) -> str:
    """Build Claude prompt for company enrichment."""
    return f"""Eres un experto en ventas B2B para agencias de servicios digitales en España.

Analiza esta empresa y devuelve EXCLUSIVAMENTE un JSON válido, sin texto adicional, sin ```json.

Empresa: {company_name}
Industria: {industry or 'sin especificar'}
Notas del comercial: {notes or 'sin notas'}

Devuelve exactamente este JSON:
{{
  "hooks": [
    "<hook de conversación específico y concreto para abrir la llamada>",
    "<hook alternativo 2>",
    "<hook alternativo 3>"
  ],
  "opening_lines": [
    "<frase de apertura natural en español, no suena a spam>",
    "<frase de apertura 2>",
    "<frase de apertura 3>"
  ],
  "call_to_action": [
    "<CTA concreto y directo para cerrar una reunión o demo>",
    "<CTA alternativo 2>"
  ],
  "opportunity_summary": "<análisis de 2-3 frases sobre la oportunidad de venta para este cliente>"
}}

Reglas:
- Hooks: mencionan un dolor concreto del sector o una oportunidad clara
- Opening lines: directas, amigables, primera persona, sin corporativismos
- CTAs: específicos (e.g. "15 min esta semana", "demo sin compromiso"), orientados a acción
- Todo en español, tono natural de llamada comercial B2B"""

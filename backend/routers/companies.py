from __future__ import annotations
"""
Companies router — enrich endpoint (sales intelligence via Claude Haiku)
and sector analysis proxy to CI-OS.
"""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import get_conn
from services.claude_enrichment import enrich_company
from config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/companies", tags=["companies"])

# CI-OS base URL — uses host.docker.internal so the LeadUp backend container
# can reach the CI-OS Next.js app running on port 3000 on the host.
CIOS_BASE_URL = get_settings().cios_base_url


class EnrichRequest(BaseModel):
    industry: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{company_id}/enrich")
async def enrich_company_endpoint(
    company_id: int,
    body: EnrichRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate hooks, opening lines, and CTAs for a company using Claude Haiku.
    Cached for 30 days — subsequent calls return the stored result instantly.
    """
    async with get_conn() as conn:
        cursor = await conn.execute(
            "SELECT id, name, industry FROM lu_companies WHERE id = ?",
            (company_id,),
        )
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    industry = body.industry or row["industry"]
    company_name = row["name"]

    logger.info(
        "enrich_company company_id=%s user_id=%s name=%r industry=%r",
        company_id,
        current_user["id"],
        company_name,
        industry,
    )

    try:
        result = await enrich_company(
            company_id=company_id,
            company_name=company_name,
            industry=industry,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("enrich_company company_id=%s error=%s", company_id, exc, exc_info=True)
        raise HTTPException(status_code=503, detail="Error al enriquecer empresa. Intenta de nuevo.")

    return {
        "success": True,
        "data": {
            "enrichment": result["enrichment"],
            "cached": result["cached"],
            "enriched_at": result["enriched_at"],
        },
    }


@router.post("/{company_id}/sector-analysis")
async def sector_analysis_endpoint(
    company_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Proxy to CI-OS competitive intelligence analysis.
    Reads industry + city from DB and calls CI-OS POST /api/analysis.
    Timeout: 15 seconds. Returns CI-OS response verbatim on success.
    """
    async with get_conn() as conn:
        cursor = await conn.execute(
            "SELECT id, name, industry, city FROM lu_companies WHERE id = ?",
            (company_id,),
        )
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    industry = row["industry"] or ""
    city = row["city"] or ""
    company_name = row["name"]

    logger.info(
        "sector_analysis company_id=%s user_id=%s name=%r industry=%r city=%r",
        company_id,
        current_user["id"],
        company_name,
        industry,
        city,
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{CIOS_BASE_URL}/api/analysis",
                json={"nicheQuery": industry, "location": city},
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            cios_data = response.json()
    except httpx.TimeoutException:
        logger.warning("sector_analysis company_id=%s CI-OS timeout", company_id)
        raise HTTPException(
            status_code=504,
            detail="Análisis no disponible. El servicio de inteligencia competitiva tardó demasiado. Inténtalo en unos minutos.",
        )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "sector_analysis company_id=%s CI-OS HTTP error status=%s",
            company_id,
            exc.response.status_code,
        )
        raise HTTPException(
            status_code=502,
            detail="Análisis no disponible. Error en el servicio de inteligencia competitiva.",
        )
    except Exception as exc:
        logger.error(
            "sector_analysis company_id=%s unexpected error=%s", company_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=502,
            detail="Análisis no disponible. Inténtalo en unos minutos.",
        )

    return {"success": True, "data": cios_data}

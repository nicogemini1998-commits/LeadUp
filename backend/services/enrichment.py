from __future__ import annotations
"""
Enriquecimiento de leads con Claude Haiku.
Genera digital_score, opportunity_level, hooks y opening_lines para cada empresa.
"""

import json
import logging
from typing import Any

import anthropic

from config import get_settings
from services.langfuse_obs import track_anthropic_call

logger = logging.getLogger(__name__)
settings = get_settings()

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


ENRICHMENT_PROMPT = """Eres un analista de ventas B2B especializado en servicios digitales para pymes españolas del sector construcción y reformas.

Analiza esta empresa y devuelve SOLO un JSON válido sin texto adicional:

Empresa: {name}
Ciudad: {city}
Industria: {industry}
Website: {website}
Teléfono: {phone}

Devuelve exactamente este JSON:
{{
  "digital_score": <número 0-100, valorando presencia digital estimada>,
  "opportunity_level": "<alta|media|baja>",
  "redes_sociales": <true|false, si probablemente tienen RRSS activas>,
  "captacion_leads": <true|false, si tienen sistema de captación>,
  "email_marketing": <true|false, si hacen email marketing>,
  "video_contenido": <true|false, si producen contenido video>,
  "seo_info": <true|false, si están bien posicionados en buscadores>,
  "hooks": [
    "<hook de conversación 1 específico para esta empresa>",
    "<hook de conversación 2>",
    "<hook de conversación 3>"
  ],
  "opening_lines": [
    "<frase de apertura 1 personalizada y natural en español>",
    "<frase de apertura 2>",
    "<frase de apertura 3>"
  ],
  "opportunity_analysis": "<análisis de 2-3 frases sobre la oportunidad de venta digital para esta empresa>"
}}

Reglas:
- digital_score alto (70-100) = empresa con web moderna, RRSS activa, ads, etc.
- digital_score bajo (0-30) = empresa sin web clara, sin presencia digital
- opportunity_level alta = pocas herramientas digitales, sector activo, potencial alto
- Los hooks deben ser ESPECÍFICOS para construcción/reformas, mencionando beneficios concretos
- Las opening_lines deben sonar naturales y conversacionales, no como spam"""


async def enrich_company(company: dict[str, Any]) -> dict[str, Any]:
    """
    Enriquece los datos de una empresa usando Claude Haiku.
    Retorna dict con campos de enriquecimiento.
    """
    client = _get_client()

    prompt = ENRICHMENT_PROMPT.format(
        name=company.get("name", ""),
        city=company.get("city", ""),
        industry=company.get("industry", "construcción y reformas"),
        website=company.get("website", "desconocido"),
        phone=company.get("phone", ""),
    )

    try:
        messages = [{"role": "user", "content": prompt}]
        response = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            messages=messages,
        )

        track_anthropic_call(
            name="leadup.enrich_company",
            model="claude-haiku-4-5",
            messages=messages,
            response=response,
            metadata={
                "company_name": company.get("name", ""),
                "city": company.get("city", ""),
                "industry": company.get("industry", ""),
            },
        )

        raw = response.content[0].text.strip()

        # Strip markdown code blocks if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw

        enriched = json.loads(raw)
        return enriched

    except json.JSONDecodeError as exc:
        logger.warning(f"JSON decode error for company {company.get('name')}: {exc}")
        return _default_enrichment()
    except anthropic.APIError as exc:
        logger.error(f"Anthropic API error for company {company.get('name')}: {exc}")
        return _default_enrichment()


def _default_enrichment() -> dict[str, Any]:
    return {
        "digital_score": 30,
        "opportunity_level": "media",
        "redes_sociales": False,
        "captacion_leads": False,
        "email_marketing": False,
        "video_contenido": False,
        "seo_info": False,
        "hooks": [
            "¿Han considerado mejorar su visibilidad online para captar más clientes de reforma?",
            "Muchas empresas del sector están usando herramientas digitales para diferenciarse.",
            "¿Cómo suelen encontrarles sus clientes actualmente?",
        ],
        "opening_lines": [
            "Buenos días, llamo de [YOUR COMPANY], ayudamos a empresas de construcción a captar clientes por internet.",
            "Hola, ¿es usted el responsable de la empresa? Le llamo porque trabajamos con empresas del sector reformas.",
            "Buenos días, somos [YOUR COMPANY], especializados en marketing digital para el sector construcción.",
        ],
        "opportunity_analysis": "Empresa con potencial de mejora en presencia digital. El sector construcción ofrece alta demanda online no atendida.",
    }

from __future__ import annotations
import asyncio
import logging
import httpx
from typing import Optional
from config import get_settings

logger = logging.getLogger(__name__)

APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "compass~crawler-google-places"

SEARCHES = [
    # Constructoras
    ("empresa de reformas integrales en Madrid", "Madrid", "Construcción"),
    ("constructoras en Barcelona", "Barcelona", "Construcción"),
    ("empresa de reformas en Valencia", "Valencia", "Construcción"),
    ("constructoras en Sevilla", "Sevilla", "Construcción"),
    # Abogados
    ("abogados mercantil en Madrid", "Madrid", "Derecho"),
    ("bufete de abogados en Barcelona", "Barcelona", "Derecho"),
    ("despacho de abogados en Valencia", "Valencia", "Derecho"),
    ("abogados en Sevilla", "Sevilla", "Derecho"),
]


async def _run_actor(query: str, limit: int = 8) -> list[dict]:
    settings = get_settings()
    token = settings.apify_api_key
    if not token:
        raise ValueError("APIFY_API_KEY no configurada")

    async with httpx.AsyncClient(timeout=30) as client:
        # Start run
        resp = await client.post(
            f"{APIFY_BASE}/acts/{ACTOR_ID}/runs",
            params={"token": token},
            json={
                "searchStringsArray": [query],
                "maxCrawledPlaces": limit,
                "language": "es",
                "maxImages": 0,
                "maxReviews": 0,
            },
        )
        resp.raise_for_status()
        run_id = resp.json()["data"]["id"]

    # Poll until done (max 3 min)
    for _ in range(36):
        await asyncio.sleep(5)
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{APIFY_BASE}/actor-runs/{run_id}",
                params={"token": token},
            )
        run_status = r.json()["data"]["status"]
        if run_status == "SUCCEEDED":
            break
        if run_status in ("FAILED", "ABORTED", "TIMED-OUT"):
            logger.warning(f"Apify run {run_id} ended with status {run_status}")
            return []

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            f"{APIFY_BASE}/actor-runs/{run_id}/dataset/items",
            params={"token": token},
        )
    return r.json() if r.status_code == 200 else []


def _normalize(item: dict, city: str, industry: str) -> Optional[dict]:
    name = item.get("title", "").strip()
    phone = item.get("phone", "").strip()
    if not name or not phone:
        return None
    return {
        "name": name,
        "phone": phone,
        "website": item.get("website", ""),
        "city": city,
        "industry": industry,
        "rating": item.get("totalScore"),
        "reviews_count": item.get("reviewsCount"),
        "address": item.get("address", ""),
    }


async def fetch_real_leads(per_search: int = 8) -> list[dict]:
    """
    Run all predefined searches in sequence and return normalized leads.
    Uses ~8 Apify credits per search.
    """
    results: list[dict] = []
    for query, city, industry in SEARCHES:
        try:
            logger.info(f"Apify search: '{query}'")
            raw = await _run_actor(query, limit=per_search)
            for item in raw:
                lead = _normalize(item, city, industry)
                if lead:
                    results.append(lead)
            logger.info(f"  → {len(raw)} raw, {len([l for l in results if l['city'] == city and l['industry'] == industry])} valid")
        except Exception as e:
            logger.error(f"Apify search failed for '{query}': {e}")
    return results

from __future__ import annotations
import logging
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import get_settings
from database import init_pool, close_pool
from services.scheduler import get_scheduler
from routers import auth, leads, admin, notes, contacts, reminders, companies, import_leads

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


async def _run_migrations() -> None:
    from database import get_conn
    try:
        async with get_conn() as conn:
            await conn.execute(
                "ALTER TABLE lu_companies ADD COLUMN IF NOT EXISTS sales_report TEXT"
            )
            await conn.execute(
                "ALTER TABLE lu_companies ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ"
            )
        logger.info("Migrations: schema up to date")
    except Exception as exc:
        logger.warning("Migrations skipped: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("LeadUp API starting up...")
    await init_pool()
    await _run_migrations()
    scheduler = get_scheduler()
    scheduler.start()
    logger.info("Scheduler started — manual assignment only, no automatic jobs")
    yield
    # Shutdown
    logger.info("LeadUp API shutting down...")
    scheduler.shutdown(wait=False)
    try:
        from services.langfuse_obs import flush as _lf_flush
        _lf_flush()
    except Exception:
        pass
    await close_pool()


_is_dev = settings.environment == "development"

app = FastAPI(
    title="LeadUp API",
    description="LeadUp — B2B prospecting CRM",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — orígenes explícitos, métodos restringidos
_cors_origins = list({
    settings.frontend_url,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    settings.frontend_url.replace("localhost", "127.0.0.1"),
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["X-Request-ID"],
)

# Routers (register before static files to avoid conflicts)
app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(admin.router)
app.include_router(notes.router)
app.include_router(contacts.router)
app.include_router(reminders.router)
app.include_router(companies.router)
app.include_router(import_leads.router, prefix="/api/admin/import")


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )


# Serve static frontend files (SPA) - Mount AFTER routers so /api/* routes work
from pathlib import Path
if Path('static').exists():
    app.mount('/', StaticFiles(directory='static', html=True), name='static')


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_level="info",
    )

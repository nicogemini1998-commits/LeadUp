<div align="center">

# LeadUp

**A B2B lead-generation and sales-pipeline CRM** — source contacts from Lusha, enrich them with AI, distribute them to your reps, and work them through a calling pipeline.

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Overview

LeadUp is a full-stack CRM built for outbound B2B sales teams. It pulls company
and contact data from [Lusha](https://www.lusha.com/), uses Claude to score each
company's digital maturity and generate tailored talking points, then hands a
daily batch of leads to each sales rep. Reps work their pipeline — logging call
outcomes, revealing contact details on demand, taking notes, and setting
follow-up reminders — while admins watch conversion analytics across the team.

It ships as a Python/FastAPI backend, a React/Vite frontend, and a PostgreSQL
database, all wired together with Docker Compose.

> **Note on lead sources.** Lusha is the primary contact-data provider. An
> optional Apify-based Google Maps scraper is included as a secondary source,
> and a standalone Inngest pilot demonstrates the Lusha → Apify enrichment
> waterfall. There is no Apollo integration.

## Features

- **Lead sourcing via Lusha** — search for B2B contacts and reveal phone/email
  on demand, with permanent caching so a revealed contact is never charged twice.
- **AI enrichment (Claude)** — each company gets a digital score, an opportunity
  level, conversation hooks, opening lines, objection handling, and a full sales
  intelligence report.
- **Lead distribution** — admins assign leads to reps manually or round-robin
  across the active commercial team; per-rep daily quotas and industry filters.
- **Calling pipeline** — per-lead status (pending, no answer, call later,
  closed, rejected, wrong number), call logs, notes, follow-up reminders, and
  optional auto-open of an external booking link when a lead is closed.
- **Excel/CSV import** — upload a spreadsheet of leads, validate the column
  mapping with AI assistance, and bulk-assign by niche.
- **Analytics dashboard** — conversion rates, per-rep breakdowns, weekly race,
  pipeline status distribution, and AI-summarized rejection analysis.
- **Export** — download all assignments, notes and reminders as a styled Excel
  workbook.
- **Auth & roles** — JWT auth with `admin` and `commercial` roles, rate
  limiting, and a restrictive CORS policy.
- **Observability (optional)** — Langfuse tracing for every Claude call.

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| Backend      | FastAPI, Uvicorn, asyncpg, Pydantic v2, python-jose (JWT), passlib/bcrypt, slowapi, APScheduler |
| AI           | Anthropic Claude (`anthropic` SDK), Langfuse (optional) |
| Lead sources | Lusha (primary), Apify Google Maps (optional) |
| Frontend     | React 18, Vite, React Router, Recharts, Motion, Tailwind CSS |
| Database     | PostgreSQL (works with any host, e.g. Supabase, RDS, local container) |
| Infra        | Docker, Docker Compose, nginx (frontend prod build) |

## Architecture

```
                ┌──────────────────────┐
                │   React + Vite SPA    │  (auth, pipeline, analytics)
                │   :5174               │
                └──────────┬───────────┘
                           │ /api  (Bearer JWT)
                ┌──────────▼───────────┐
                │   FastAPI backend     │  routers: auth, leads, admin,
                │   :8002               │  notes, contacts, reminders,
                └──┬─────────┬──────┬───┘  companies, import
                   │         │      │
        ┌──────────▼─┐  ┌────▼────┐ │
        │ PostgreSQL │  │  Claude │ │   services:
        │  lu_* tabs │  │  (AI)   │ │   - enrichment / claude_enrichment
        └────────────┘  └─────────┘ │   - lusha_client / lusha_leads
                                     │   - apify_gmaps / google_maps_leads
                            ┌────────▼────────┐  - report_generator
                            │  Lusha / Apify  │  - email_service / scheduler
                            └─────────────────┘  - langfuse_obs
```

Core tables are prefixed `lu_`: `lu_users`, `lu_companies`, `lu_contacts`,
`lu_daily_assignments`, `lu_reminders`, `lu_call_logs`.

## Getting Started

### Prerequisites

- Docker + Docker Compose (recommended), **or**
- Python 3.11 and Node 20 for a local non-Docker setup
- A PostgreSQL database
- API keys: Anthropic (enrichment) and Lusha (lead sourcing). Apify is optional.

### 1. Clone and configure

```bash
git clone <your-fork-url> leadup
cd leadup
cp .env.example .env
# Edit .env and fill in JWT_SECRET, DATABASE_URL, ANTHROPIC_API_KEY, LUSHA_API_KEY, ...
```

### 2a. Run with Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:5174
- Backend API + docs: http://localhost:8002/docs

### 2b. Run locally (without Docker)

Backend:

```bash
cd backend
cp .env.example .env        # fill in values
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 3. Seed demo data (optional, local/dev only)

```bash
cd backend
python create_users.py      # demo users (admin@example.com / ChangeMe123)
python seed_test_leads.py   # fictitious demo leads
```

> The seed scripts insert **synthetic** demo data only. Never put real prospect
> data in seed scripts.

### 4. Run the tests

```bash
cd backend
pytest
```

## Project Structure

```
leadup/
├── backend/                 # FastAPI application
│   ├── main.py              # app entrypoint, CORS, rate limiting, lifespan
│   ├── config.py            # pydantic-settings (env-driven configuration)
│   ├── database.py          # asyncpg pool + aiosqlite-compatible wrapper
│   ├── auth.py              # JWT + password hashing + role guards
│   ├── routers/             # auth, leads, admin, notes, contacts, reminders, companies, import
│   ├── services/            # lusha, apify, claude enrichment, reports, scheduler, email, langfuse
│   ├── tests/               # pytest smoke tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React + Vite SPA
│   ├── src/
│   │   ├── pages/           # Login, Dashboard, Pipeline, Analytics, Ajustes, Scripts
│   │   ├── components/      # CompanyCard, CompanyModal, StatusBar, ...
│   │   ├── hooks/           # useAuth, useTheme, useReminders, ...
│   │   └── lib/             # axios api client, toast helpers
│   └── .env.example
├── inngest-pilot/           # optional: Inngest enrichment-waterfall pilot (Lusha → Apify)
├── docker-compose.yml
├── Dockerfile               # backend image
├── .env.example
└── LICENSE
```

## Security Notes

- **No secrets in the repo.** All credentials are read from environment
  variables. Copy `.env.example` to `.env` and supply your own values.
- `JWT_SECRET` is **required** and has no insecure default — set a strong random
  value (`openssl rand -hex 32`).
- The demo users created by `create_users.py` use throwaway passwords. Change or
  remove them before any real deployment.
- CORS origins, rate limiting and role-based access control are configured in
  `backend/main.py` and `backend/auth.py`.
- API docs (`/docs`, `/redoc`, `/openapi.json`) are only exposed when
  `ENVIRONMENT=development`.

## Screenshots

> _No screenshot is bundled with this repository yet. To add one, drop an image
> at `docs/screenshot.png` and reference it here._

## License

[MIT](LICENSE) © HBD Revolution SL

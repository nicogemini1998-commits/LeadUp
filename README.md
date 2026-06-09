<div align="center">

# 📈 LeadUp

### The AI-enriched B2B sales pipeline that turns raw contacts into booked calls

**Source contacts from Lusha, let Claude score and brief every company, hand each rep a daily batch, and work the whole pipeline — calls, notes, reminders, analytics — from one dashboard.**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Anthropic Claude](https://img.shields.io/badge/AI-Anthropic%20Claude-D97757?logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Overview

**LeadUp** is a full-stack CRM built for outbound B2B sales teams that live on the phone. It pulls company and contact data from [Lusha](https://www.lusha.com/), then uses **Claude** to score each company's digital maturity, surface the opportunity, and generate tailored talking points — conversation hooks, opening lines, objection handling, and a full sales-intelligence report. Admins distribute a daily batch of qualified leads to each rep; reps work their pipeline by logging call outcomes, revealing contact details on demand, taking notes, and setting follow-up reminders, while the analytics dashboard tracks conversion across the whole team.

It's designed for **sales managers and SDR/BDR teams** who want their reps spending time talking to the right companies instead of researching them. The interesting engineering lives in the **enrichment layer** (cost-aware Claude calls with a graceful mock fallback and Langfuse tracing) and the **contact economics**: a revealed phone or email is cached permanently in Postgres, so the same contact is never paid for twice.

It ships as a **Python/FastAPI** backend, a **React + Vite** SPA, and a **PostgreSQL** database, wired together with Docker Compose.

> 💡 **On lead sources.** Lusha is the primary contact-data provider. An optional Apify-based Google Maps scraper is included as a secondary source, and a standalone Inngest pilot demonstrates the Lusha → Apify enrichment waterfall. **There is no Apollo integration.**

---

## ✨ Features

- **🔍 Lead sourcing via Lusha** — search B2B contacts and reveal phone/email **on demand**, with permanent Postgres caching so a revealed contact is never charged twice.
- **🤖 AI enrichment (Claude)** — each company gets a **digital score**, an **opportunity level**, conversation hooks, opening lines, objection handling, and an on-demand full **sales-intelligence report**. Runs on `claude-haiku-4-5` with a deterministic mock fallback when no key is set.
- **🎯 Lead distribution** — admins assign leads to reps manually or round-robin across the active commercial team, with per-rep **daily quotas** and **industry/niche filters**.
- **📞 Calling pipeline** — per-lead status (`pending`, `no answer`, `call later`, `closed`, `rejected`, `wrong number`), call logs, notes, follow-up reminders, and an optional auto-open of an external **booking link** when a lead is closed.
- **📊 Analytics dashboard** — conversion rates, per-rep breakdowns, a **weekly race** leaderboard, pipeline status distribution, and an **AI-summarized rejection analysis**.
- **📥 Excel / CSV import** — upload a spreadsheet, validate the column mapping with **AI assistance**, then bulk-assign by niche.
- **📤 Styled export** — download all assignments, notes and reminders as a formatted Excel workbook.
- **🔐 Auth & roles** — JWT auth with `admin` and `commercial` roles, per-route rate limiting (slowapi), and a restrictive CORS policy.
- **🔭 Observability (optional)** — Langfuse tracing for every Claude call.
- **🌗 Polished SPA** — React + Vite with React Router, **Recharts** dashboards, **Motion**/GSAP animations, Tailwind 4, light/dark theme, and a weekly-race leaderboard.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Uvicorn, asyncpg, Pydantic v2, python-jose (JWT), passlib/bcrypt, slowapi (rate limiting), APScheduler |
| **AI** | Anthropic Claude (`anthropic` SDK, `claude-haiku-4-5`), Langfuse (optional tracing) |
| **Lead sources** | Lusha (primary), Apify Google Maps (optional secondary) |
| **Frontend** | React 18, Vite 8, React Router, Recharts, Motion, GSAP, Tailwind CSS 4, axios |
| **Database** | PostgreSQL (any host — bundled container, Supabase, RDS, …) |
| **Infra** | Docker, Docker Compose, nginx (frontend prod build) |

---

## 🏗️ Architecture

```
                ┌──────────────────────────┐
                │   React + Vite SPA        │  Login · Dashboard · Pipeline
                │   :5174 (nginx in prod)   │  Analytics · Scripts · Settings
                └────────────┬─────────────┘
                             │ /api  (Bearer JWT)
                ┌────────────▼─────────────┐
                │   FastAPI backend  :8002  │  routers: auth, leads, admin,
                │   JWT · rate limit · CORS │  notes, contacts, reminders,
                └──┬──────────┬────────┬────┘  companies, import
                   │          │        │
        ┌──────────▼─┐   ┌────▼────┐   │      services:
        │ PostgreSQL │   │  Claude │   │       · enrichment / claude_enrichment
        │  lu_* tabs │   │  (AI)   │   │       · lusha_client / lusha_leads
        └────────────┘   └─────────┘   │       · apify_gmaps / google_maps_leads
                                        │       · report_generator · scheduler
                              ┌─────────▼────────┐  · email_service · langfuse_obs
                              │  Lusha / Apify   │  · import_validator · excel_reader
                              └──────────────────┘
```

**Data flow:** source from Lusha (or import an Excel) → Claude enriches each company (score, hooks, report) → admin distributes a daily batch → rep reveals contact + logs the call → status, notes & reminders persist → admin watches conversion analytics.

**Core tables** are prefixed `lu_`: `lu_users`, `lu_companies`, `lu_contacts`, `lu_daily_assignments`, `lu_reminders`, `lu_call_logs`.

**Key API surface** (FastAPI routers):

| Prefix | Highlights |
|---|---|
| `/api/auth` | `login`, `me` |
| `/api/leads` | `today`, `week-pipeline`, status & follow-up updates, `reveal-phone`, `generate-report`, `call-logs`, `objections`, `rejected` |
| `/api/admin` | `assign-now`, `assign-bulk`, `analytics`, `rejection-analysis`, `lusha-load`, `trigger-enrichment`, `unassigned-leads`, `export-notes` |
| `/api/companies` | `{id}/enrich`, `{id}/sector-analysis` |
| `/api/contacts` | `{id}/reveal-phone`, contact updates |
| `/api/notes` · `/api/assignments/.../reminders` | per-lead notes & follow-up reminders |
| `/api/admin/import` | `upload`, `validate`, `assign` (Excel/CSV) |

---

## 🚀 Getting Started

### Prerequisites

- Docker + Docker Compose **(recommended)**, *or* Python 3.11 and Node 20 for a local non-Docker setup
- A PostgreSQL database (or use the bundled container)
- API keys: **Anthropic** (enrichment) and **Lusha** (lead sourcing). Apify is optional.

### 1. Clone and configure

```bash
git clone <your-fork-url> leadup
cd leadup
cp .env.example .env
# Edit .env → set JWT_SECRET, DATABASE_URL, ANTHROPIC_API_KEY, LUSHA_API_KEY, ...
```

### 2a. Run with Docker Compose (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| 🖥️ Frontend | <http://localhost:5174> |
| ⚙️ Backend API + docs | <http://localhost:8002/docs> |

### 2b. Run locally (without Docker)

**Backend:**

```bash
cd backend
cp .env.example .env        # fill in values
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

**Frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 3. Seed demo data *(optional — local/dev only)*

```bash
cd backend
python create_users.py      # demo users (admin@example.com / ChangeMe123)
python seed_test_leads.py   # fictitious demo leads
```

> ⚠️ The seed scripts insert **synthetic** demo data only. Never put real prospect data in seed scripts.

### 4. Run the tests

```bash
cd backend
pytest
```

---

## 📁 Project Structure

```
leadup/
├── backend/                 # FastAPI application
│   ├── main.py              # app entrypoint: CORS, rate limiting, lifespan, migrations
│   ├── config.py            # pydantic-settings (env-driven configuration)
│   ├── database.py          # asyncpg pool (+ sqlite-compatible wrapper for tests)
│   ├── auth.py              # JWT + password hashing + role guards
│   ├── routers/             # auth, leads, admin, notes, contacts, reminders, companies, import
│   ├── services/            # lusha_*, apify_gmaps, claude_enrichment, report_generator,
│   │                        #   scheduler, email_service, langfuse_obs, import_validator
│   ├── tests/               # pytest smoke tests
│   └── .env.example
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── pages/           # Login, Dashboard, Pipeline, Analytics, Ajustes, Scripts
│       ├── components/      # CompanyCard, CompanyModal, WeeklyRace, RevealPhoneButton,
│       │                    #   CallNoteSheet, RemindersList, ImportLeadsSection, ...
│       ├── hooks/           # useAuth, useTheme, useReminders, useRevealPhone, useCallLogs, ...
│       └── lib/             # axios api client, toast helpers
├── inngest-pilot/           # optional: Inngest enrichment-waterfall pilot (Lusha → Apify)
├── docker-compose.yml
├── Dockerfile               # backend image
├── .env.example
└── LICENSE
```

---

## 🔐 Security & Configuration

- **No secrets in the repo.** All credentials are read from environment variables. Copy `.env.example` → `.env` and supply your own values.
- **`JWT_SECRET` is required** and has no insecure default — set a strong random value: `openssl rand -hex 32`.
- The demo users created by `create_users.py` use throwaway passwords — change or remove them before any real deployment.
- **CORS origins, rate limiting and role-based access control** are configured in `backend/main.py` and `backend/auth.py`.
- API docs (`/docs`, `/redoc`, `/openapi.json`) are only exposed when `ENVIRONMENT=development`.

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | JWT signing secret (**required**) |
| `DATABASE_URL` | PostgreSQL connection string (**required**) |
| `ANTHROPIC_API_KEY` | Claude enrichment (mock fallback if unset) |
| `LUSHA_API_KEY` | Primary lead/contact source |
| `APIFY_API_KEY` | Optional Google Maps scraper |
| `FRONTEND_URL` / `VITE_API_URL` | CORS origin + frontend → API base |
| `BOOKING_URL` | Optional external booking link on lead close |
| `SMTP_*` / `LOW_LEADS_THRESHOLD` | Optional email notifications |
| `LANGFUSE_*` | Optional Claude-call tracing |

---

## 📸 Screenshots

> _No screenshot is bundled with this repository yet. To add one, drop an image at `docs/screenshot.png` and reference it here:_ `![LeadUp](docs/screenshot.png)`

---

## 📄 License

[MIT](LICENSE) © HBD Revolution SL

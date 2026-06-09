# LeadUp Inngest Pilot

An optional, self-contained pilot that runs the lead-enrichment **waterfall
(Lusha → Apify)** on [Inngest](https://www.inngest.com/) instead of a visual
workflow tool. Inngest gives you code-first (TypeScript) functions with
step-level durability, automatic retries, concurrency limits, and replay
debugging.

> This is a standalone experiment. The main LeadUp backend does not depend on it.

## Quickstart

```bash
cd inngest-pilot
npm install
npm run dev
```

The Inngest Dev Server opens a dashboard at http://localhost:8288 and the
Fastify handler runs at http://localhost:3100/api/inngest .

## Trigger a test event

```bash
curl -X POST http://localhost:8288/e/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "leadup/lead.enrich.requested",
    "data": { "companyName": "Acme Corp", "domain": "acme.example" }
  }'
```

Watch the step-by-step execution in the dashboard.

## Structure

```
inngest-pilot/
  package.json
  tsconfig.json
  README.md
  src/
    inngest.ts                  # Inngest client
    server.ts                   # Fastify + /api/inngest handler
    functions/
      enrichWaterfall.ts        # Lusha -> Apify waterfall function
```

## Environment variables

Set these in your environment (or a local `.env`):

- `LUSHA_API_KEY` — primary enrichment source
- `APIFY_TOKEN` — optional Google Maps fallback

## Possible next steps

1. Persistence: POST results to the LeadUp backend (`/api/companies`) to write
   into `lu_companies` / `lu_contacts`.
2. Observability: wrap `step.run` with OpenTelemetry and export traces to your
   tracing backend (e.g. Langfuse).
3. Deployment: run as a separate service alongside the backend.

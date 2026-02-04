# Enquiry Widget + Lead Triage Demo (Next.js + TypeScript + SQL)

A small full-stack demo that captures website enquiries with minimal friction, enriches them with context, and provides an internal admin triage board to improve response time and lead handling.

## Why this exists (problem)
Many businesses collect enquiries from multiple pages, but operational pain comes from:
- mixed intent (quick questions vs high-value enquiries)
- missing context (which page / what they were looking at)
- slow response time (no prioritisation / routing)
- messy manual triage (no workflow)

## What I built (solution)
### Customer-facing
- Reusable enquiry widget used across pages:
  - `/contact` (intent chooser)
  - `/van-fleets` (fleet form first + quick-question switch)
  - `/part-exchange` (part-ex form first + quick-question switch)
- Progressive disclosure (shows only relevant fields)
- Validation rules (email OR phone required; part-ex requires reg + mileage)

### Internal admin (money-impact features)
- `/admin` triage board:
  - View enquiries stored in SQL
  - Filter by mode/status (and queue if enabled)
  - Update status: NEW → CONTACTED → CLOSED
- Operational improvements:
  - SLA/priority (high-value leads get a faster response target)
  - Routing into queues (e.g. Fleet / Valuations / General)
  - First response timestamp (set when moved to CONTACTED)

## Tech stack
- Next.js (App Router) + React + TypeScript
- SQLite + Prisma ORM (migrations + client)
- Zod validation + react-hook-form
- TailwindCSS

## Data model (high level)
- `Enquiry`: core lead details + status, priority, SLA fields
- `EnquiryContext`: pageUrl, referrer, UTMs, device
- `PartExchangeDetails`: reg + mileage (only for part-ex)

## How to run locally
```bash
npm install
npx prisma migrate dev
npm run dev
```

Open:

- http://localhost:3000/contact
- http://localhost:3000/van-fleets
- http://localhost:3000/part-exchange
- http://localhost:3000/admin

## Testing the flow
1. Submit an enquiry from `/contact` (quick question)
2. Submit from `/part-exchange` with reg + mileage
3. Open `/admin` and update status / routing
4. Refresh and confirm persistence in SQL

## Future improvements
- Authentication for `/admin`
- Email notifications / webhooks to CRM
- Rate limiting + spam protection
- Deployment using Postgres instead of SQLite for production hosting

## Screenshots
![Contact chooser](/screenshots/contact.png)
![Part exchange](/screenshots/part-exchange.png)
![Van fleets](/screenshots/van-fleets.png)
![Admin triage](/screenshots/admin.png)
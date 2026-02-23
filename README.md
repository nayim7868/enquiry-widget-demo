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
- Next.js 16 (App Router) + React + TypeScript
- SQLite or PostgreSQL + Prisma ORM (migrations + client)
- Zod validation + react-hook-form
- TailwindCSS
- Docker Compose (for local Postgres)

**Note:** This project uses Next.js 16's `proxy` convention (migrated from `middleware` using `@next/codemod`).

## Data model (high level)
- `Enquiry`: core lead details + status, priority, SLA fields
- `EnquiryContext`: pageUrl, referrer, UTMs, device
- `PartExchangeDetails`: reg + mileage (only for part-ex)

## How to run locally

### Option 1: SQLite (default, no setup required)
```bash
npm install
npx prisma migrate dev
npm run dev
```

### Option 2: PostgreSQL (using Docker)

1. **Start PostgreSQL:**
   ```bash
   docker compose up -d
   ```
   This starts a Postgres 16 container on port 5432 with:
   - User: `app`
   - Password: `app`
   - Database: `enquiry_demo`

2. **Configure environment:**
   Create a `.env.local` file (not committed) with:
   ```env
   DATABASE_URL="postgresql://app:app@localhost:5432/enquiry_demo?schema=public"
   AUTH_SECRET="your-secret-key-here-minimum-32-characters-long"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD_HASH_B64="your-base64-encoded-bcrypt-hash-here"
   ```

3. **Update Prisma schema:**
   Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`

4. **Run migrations:**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the app:**
   ```bash
   npm run dev
   ```

6. **Stop PostgreSQL (when done):**
   ```bash
   docker compose down
   ```
   To remove data volume: `docker compose down -v`

**Note:** The `.env.local` file should contain your actual `DATABASE_URL` and is not committed to git.

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
![Admin triage](public/screenshots/admin.png)
![Contact chooser](public/screenshots/contact.png)
![Part exchange](public/screenshots/part-exchange.png)
![Van fleets](public/screenshots/van-fleets.png)

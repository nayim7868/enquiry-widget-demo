# Enquiry Widget + Lead Triage Demo

A full-stack Next.js application demonstrating customer enquiry capture, admin lead triage, security fundamentals, and database patterns. Built as a portfolio project to showcase practical engineering decisions and technical depth.

## Summary

This project demonstrates a complete enquiry management system with:
- **Customer-facing** enquiry forms across multiple pages (`/contact`, `/van-fleets`, `/part-exchange`)
- **Admin triage board** for lead management with SLA tracking and status workflows
- **Security** via JWT session cookies, route protection, and RBAC
- **Database** patterns including Postgres views, functions, and audit logging
- **Testing** infrastructure with Vitest unit tests and Playwright E2E tests
- **CI/CD** pipeline via GitHub Actions

## Why This Project

This project was intentionally extended beyond a basic demo to demonstrate:

- **Security fundamentals**: JWT session management, httpOnly cookies, defense-in-depth (proxy + API-level checks), RBAC
- **Database competency**: Postgres enums, views for derived data, functions for controlled updates, audit logging
- **Testing strategy**: Unit tests for pure logic, E2E tests for critical workflows, CI integration
- **Pragmatic engineering**: Migration from SQLite to Postgres, handling Prisma 7 adapter requirements, Next.js 16 proxy migration

## Features

### Customer-Facing

- **Reusable enquiry widget** across multiple pages:
  - `/contact` - Intent chooser (quick question vs quote)
  - `/van-fleets` - Fleet enquiry form with quick-question fallback
  - `/part-exchange` - Part-exchange form with registration + mileage
- **Progressive disclosure** - Shows only relevant fields based on enquiry type
- **Validation** - Email OR phone required; part-ex requires reg + mileage
- **Context capture** - Page URL, referrer, UTM parameters, device info

### Admin Triage

- **Triage board** (`/admin`) with:
  - View all enquiries with filtering by mode/status/queue
  - Update status workflow: NEW → CONTACTED → CLOSED
  - Queue assignment (GENERAL, FLEET, VALUATIONS)
  - Priority and SLA tracking
  - First response timestamp (auto-set on CONTACTED)
  - Assigned-to field for ownership
- **Triage view API** (`/api/admin/triage`) - Reads from Postgres view with derived SLA fields
- **Status updates** - Controlled via Postgres function with audit trail

### Security

- **JWT session** in httpOnly cookie (8-hour expiration)
- **Route protection** via Next.js proxy (formerly middleware) + API-level session checks
- **RBAC** - Role-based access control (ADMIN, ANALYST, VIEWER roles)
- **Defense in depth** - Both proxy layer and API routes enforce authentication
- **Audit logging** - All admin actions logged with actor, changes, IP, user agent

### Database / Backend

- **PostgreSQL** with Prisma ORM (migrated from SQLite)
- **Postgres enums** for type safety (EnquiryStatus, EnquiryMode, EnquiryType, etc.)
- **Database view** (`enquiry_triage_view`) - Computes SLA breach and minutes remaining
- **Database function** (`set_enquiry_status`) - Controlled status updates with first-response timestamp and audit log insertion
- **Audit log table** - Tracks all admin actions with before/after changes

### Testing / CI

- **Vitest** unit tests for pure logic (auth helpers, validation schemas)
- **Playwright** E2E test covering golden path (enquiry submission → admin login → status update)
- **GitHub Actions CI** - Runs unit tests and E2E tests with Postgres service container

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Prisma 7** + PostgreSQL (with `@prisma/adapter-pg`)
- **jose** - JWT signing/verification
- **bcryptjs** - Password hashing
- **Zod** - Schema validation
- **react-hook-form** - Form handling
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **GitHub Actions** - CI/CD

## Architecture Overview

```
┌─────────────────┐
│  Public Pages   │
│  /contact       │
│  /van-fleets    │
│  /part-exchange │
└────────┬────────┘
         │ POST
         ▼
┌─────────────────┐
│ /api/enquiries  │ (public POST)
│   - Validation  │
│   - Store DB    │
└─────────────────┘

┌─────────────────┐
│  Admin UI       │
│  /admin         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Proxy Layer    │ (JWT cookie check)
│  /proxy.ts      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Protected APIs │
│  GET /api/enquiries │
│  PATCH /api/enquiries/[id] │
│  GET /api/admin/triage │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API-level      │ (requireSession + RBAC)
│  Session Check  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  - Enquiry      │
│  - AuditLog     │
│  - Views        │
│  - Functions    │
└─────────────────┘
```

**Key Architecture Points:**

1. **Proxy layer** (`/proxy.ts`) intercepts requests to `/admin/*` and `/api/enquiries/*` and verifies JWT cookie
2. **API routes** also check session via `requireSession()` - defense in depth
3. **RBAC** - `canMutate()` checks role before allowing PATCH operations
4. **Postgres function** - `set_enquiry_status()` handles status updates atomically with audit logging
5. **Postgres view** - `enquiry_triage_view` computes SLA fields in the database

## Database Notes

### Migration from SQLite to PostgreSQL

The project was initially developed with SQLite for simplicity, then migrated to PostgreSQL to enable:
- **Postgres enums** for type safety
- **Database views** for derived/computed fields
- **Database functions** for controlled updates
- **Better interview relevance** (Postgres is more common in production)

### Database Features

- **Enums**: `EnquiryStatus`, `EnquiryMode`, `EnquiryType`, `EnquiryPriority`, `EnquiryQueue`
- **View**: `enquiry_triage_view` - Computes `sla_breached` (boolean) and `sla_minutes_remaining` (integer) from `slaDueAt`
- **Function**: `set_enquiry_status()` - Updates status, sets `firstRespondedAt` on first CONTACTED, inserts audit log
- **Audit Log**: Tracks all admin actions with before/after changes, actor info, IP, user agent

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or Docker for containerized Postgres)
- npm

### Step-by-Step Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL (using Docker Compose):**
   ```bash
   docker compose up -d
   ```
   This starts a Postgres 16 container on port 5432 with:
   - User: `app`
   - Password: `app`
   - Database: `enquiry_demo`

3. **Configure environment variables:**
   
   Create a `.env.local` file (not committed) with:
   ```env
   DATABASE_URL="postgresql://app:app@localhost:5432/enquiry_demo?schema=public"
   AUTH_SECRET="your-secret-key-here-minimum-32-characters-long"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD_HASH_B64="your-base64-encoded-bcrypt-hash-here"
   ```

   **Generating password hash:**
   
   The project uses `ADMIN_PASSWORD_HASH_B64` (base64-encoded bcrypt hash) to avoid shell escaping issues with `$` characters. To generate:
   
   ```bash
   # Using Node.js
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(h => console.log(Buffer.from(h).toString('base64')))"
   ```
   
   Or use the legacy `ADMIN_PASSWORD_HASH` format (with proper escaping in `.env.local`).

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```
   This will:
   - Generate Prisma Client
   - Apply all migrations to your database
   - Create the schema (tables, enums, views, functions)

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Public pages: http://localhost:3000/contact
   - Admin login: http://localhost:3000/admin/login
   - Admin dashboard: http://localhost:3000/admin (after login)

7. **Stop PostgreSQL (when done):**
   ```bash
   docker compose down
   ```
   To remove data volume: `docker compose down -v`

### Login Credentials

Use the email and password configured in your `.env.local`:
- Email: Value of `ADMIN_EMAIL`
- Password: The plain password that was hashed to create `ADMIN_PASSWORD_HASH_B64`

## Running Tests

### Unit Tests

```bash
# Run once
npm run test:unit

# Watch mode
npm run test:unit:watch

# With coverage
npm run test:unit:coverage
```

Unit tests cover:
- Validation schemas (`src/lib/validation.test.ts`)
- Auth helpers (`src/lib/auth.test.ts`)

### E2E Tests

**Prerequisites:**
- Development server running (or Playwright will start it automatically)
- Environment variables set (Playwright loads from `.env.local`)

**PowerShell (Windows):**
```powershell
$env:E2E_ADMIN_EMAIL="admin@example.com"
$env:E2E_ADMIN_PASSWORD="Bristol#2026"
npm run test:e2e
```

**Bash (Linux/Mac):**
```bash
export E2E_ADMIN_EMAIL="admin@example.com"
export E2E_ADMIN_PASSWORD="Bristol#2026"
npm run test:e2e
```

**Other commands:**
```bash
# UI mode
npm run test:e2e:ui

# Headed browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

E2E tests cover:
- Golden path: Public enquiry submission → Admin login → Status update

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push and pull requests:

1. **Unit Tests Job** - Runs Vitest unit tests
2. **E2E Tests Job** - Runs Playwright E2E tests with:
   - Postgres 16 service container
   - All required environment variables
   - Artifact upload on failure (playwright-report, test-results)

## Known Limitations / Future Improvements

### Current Limitations

- **Env-based demo auth** - Single admin user configured via environment variables (not database-backed)
- **Single admin role** - RBAC structure exists but only ADMIN is used in practice
- **No rate limiting** - Public enquiry endpoints lack rate limiting / abuse protection
- **No CSRF hardening** - Relies on same-origin policy (could add CSRF tokens)
- **No background jobs** - All processing is synchronous
- **Mixed update patterns** - Status updates use DB function, but queue/assignedTo updates are app-side (could be unified)
- **Limited filtering** - Admin UI has basic filtering, could add search, date ranges, etc.
- **No production deployment config** - No Dockerfile, deployment scripts, or production environment setup

### Future Improvements

- **Database-backed auth** - User table with roles, password reset, session management
- **Stricter authorization** - Fine-grained permissions, resource-level access control
- **Rate limiting** - Protect public endpoints from abuse
- **More E2E coverage** - Additional test scenarios (error cases, edge cases)
- **Deployment** - Production deployment configuration, observability (logging, monitoring)
- **Seed data** - Fixtures for development/testing
- **Background jobs** - Email notifications, webhook integrations, async processing

## Screenshots

_To be added:_
- [ ] Admin triage board
- [ ] Contact form
- [ ] Part-exchange form
- [ ] Van fleets form

## Learning Outcomes

This project provided hands-on experience with:

- **Framework/runtime migration** - Next.js 16 middleware → proxy migration, Prisma 7 adapter requirements
- **Database migration** - SQLite → PostgreSQL, handling type differences (DATETIME → TIMESTAMP), migration drift
- **Prisma 7 challenges** - Adapter model, connection URL handling, shadow database issues with function return types
- **Secure cookie auth patterns** - JWT in httpOnly cookies, defense-in-depth, session management
- **Database patterns** - Views for derived data, functions for controlled updates, audit logging
- **Testing infrastructure** - Vitest setup, Playwright E2E, CI integration, environment variable handling
- **CI/CD** - GitHub Actions with service containers, artifact management

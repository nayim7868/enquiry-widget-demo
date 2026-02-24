# Technical Decisions

This document explains the "why" behind key technical decisions in this project.

## 1. Scope Strategy: Extend Existing Project

**Decision:** Extend an existing enquiry widget demo rather than starting a new project from scratch.

**Why:**
- **Depth over breadth** - Demonstrating migration skills, security patterns, and database competency on a real codebase shows more than a greenfield project
- **Interview ROI** - Shows ability to work with existing code, handle technical debt, and make pragmatic improvements
- **Real-world context** - Real migrations (SQLite → Postgres, middleware → proxy) are more valuable than theoretical examples

**Tradeoffs:**
- Some legacy patterns remain (e.g., mixed update patterns)
- Not a "perfect" greenfield architecture
- But demonstrates practical engineering judgment

## 2. Auth Approach: Env-Based Admin Demo Auth

**Decision:** Use environment variable-based admin authentication instead of a database-backed user system.

**Why:**
- **Fastest path to security features** - Allows demonstrating JWT sessions, route protection, RBAC without building a full user management system
- **Sufficient for demo** - Single admin user is enough to showcase security patterns
- **Focus on core features** - More time for enquiry management, triage, and database patterns

**Tradeoffs:**
- Not production-ready (no user management, password reset, etc.)
- Single admin user limits multi-user scenarios
- But demonstrates security fundamentals without scope creep

**How to Evolve:**
- Add `User` table with email, password hash, role
- Migrate from env-based to DB-backed auth
- Add password reset flow, session management UI
- Keep existing JWT session pattern (just change where user data comes from)

## 3. JWT Session in httpOnly Cookie

**Decision:** Use JWT tokens stored in httpOnly cookies for session management.

**Why:**
- **httpOnly cookies** - Prevents XSS attacks from accessing session tokens (JavaScript cannot read httpOnly cookies)
- **jose library** - Modern, standards-compliant JWT implementation (better than `jsonwebtoken` for edge runtime compatibility)
- **Stateless** - No server-side session store needed (JWT contains user info)
- **8-hour expiration** - Reasonable balance between security and UX

**Security Properties:**
- **httpOnly** - XSS protection
- **sameSite: "lax"** - CSRF protection for most cases (GET requests are safe, POST requires same origin)
- **secure in production** - HTTPS-only in production environment
- **JWT signing** - Tamper-proof tokens (HS256 with AUTH_SECRET)

**Limitations in Demo Context:**
- No token refresh mechanism (8-hour expiration is fixed)
- No revocation (can't invalidate tokens before expiration)
- Single AUTH_SECRET (production would use key rotation)

## 4. Defense in Depth

**Decision:** Implement authentication checks at both the proxy layer and API route level.

**Why:**
- **Proxy layer** (`/proxy.ts`) - First line of defense, blocks unauthenticated requests early
- **API route level** (`requireSession()`) - Second check, ensures even if proxy is bypassed, APIs are protected
- **RBAC checks** - Third layer, `canMutate()` ensures only authorized roles can perform mutations

**Why Both Layers Matter:**
- **Proxy** - Catches unauthenticated requests before they reach route handlers (better performance, cleaner error handling)
- **API routes** - Defense against proxy misconfiguration, direct API access, or future route additions
- **RBAC** - Fine-grained authorization (not all authenticated users can mutate)

**Tradeoffs:**
- Some duplication (session verification in both places)
- But provides robust security with minimal complexity

## 5. Audit Logging

**Decision:** Log all admin actions (status updates, queue changes, assignments) with before/after changes, actor info, IP, and user agent.

**Why:**
- **Accountability** - Know who changed what and when
- **Debugging** - Track down issues by reviewing audit trail
- **Compliance** - Some industries require audit logs
- **Security** - Detect suspicious activity patterns

**What is Logged:**
- Actor email and role
- Action type (e.g., `ENQUIRY_UPDATE`)
- Entity type and ID
- Before/after changes (JSON diff)
- IP address and user agent

**Privacy/PII Considerations:**
- Logs contain email addresses (PII)
- In production, consider:
  - Retention policies (auto-delete after X days)
  - Access controls (only admins can view audit logs)
  - Encryption at rest
  - Anonymization for long-term storage

## 6. Move from SQLite to PostgreSQL

**Decision:** Migrate from SQLite (development) to PostgreSQL for production-like database features.

**Why:**
- **Postgres enums** - Type safety at database level (not just Prisma)
- **Views** - Compute derived fields (SLA breach, minutes remaining) in database
- **Functions** - Controlled status updates with atomic audit logging
- **Interview relevance** - Postgres is more common in production than SQLite
- **Scalability** - Postgres handles concurrent writes better

**Migration Challenges Encountered:**
- **Type differences** - SQLite `DATETIME` → Postgres `TIMESTAMP(3)`
- **Migration drift** - Old migrations had SQLite-specific syntax (`PRAGMA`, etc.)
- **Shadow database issues** - Postgres cannot change function return types with `CREATE OR REPLACE`, required `DROP FUNCTION` first
- **Prisma 7 adapter** - Required `@prisma/adapter-pg` and connection pool management

**What Was Learned:**
- Always test migrations on target database early
- Postgres functions require careful return type planning
- Prisma 7 adapter model requires explicit connection management

## 7. Database-Side Logic

### View: `enquiry_triage_view`

**Decision:** Compute SLA breach and minutes remaining in a Postgres view rather than application code.

**Why:**
- **Consistency** - Derived data is always correct (no risk of app code bugs)
- **Performance** - Database computes once, app just queries
- **Simplicity** - App code doesn't need SLA calculation logic
- **Single source of truth** - View definition is the authoritative SLA logic

**Benefits:**
- App code just queries the view: `SELECT * FROM enquiry_triage_view`
- No need to recalculate SLA fields in multiple places
- Database handles timezone and timestamp arithmetic correctly

### Function: `set_enquiry_status`

**Decision:** Move status updates into a Postgres function that atomically updates status, sets `firstRespondedAt`, and inserts audit log.

**Why:**
- **Atomicity** - All three operations (update status, set timestamp, insert audit) happen in one transaction
- **Consistency** - `firstRespondedAt` is always set correctly (no race conditions)
- **Audit coupling** - Audit log is guaranteed to be written (can't forget to log)
- **Controlled updates** - Function enforces business rules (e.g., only set `firstRespondedAt` on first CONTACTED)

**Tradeoff:**
- **Mixed update patterns** - Status updates use DB function, but queue/assignedTo updates are still app-side
- Could be unified by extending function or creating separate functions
- But demonstrates both patterns (DB function for complex logic, app-side for simple updates)

## 8. Testing Strategy

**Decision:** Start with Vitest unit tests for pure logic, then add Playwright E2E test for golden path.

**Why:**
- **Unit tests first** - Fast feedback, test pure functions (auth helpers, validation) without infrastructure
- **E2E second** - Prove the full workflow works end-to-end (enquiry → admin → status update)
- **Pragmatic coverage** - Focus on critical paths rather than 100% coverage

**What Remains:**
- More route/integration tests (API route handlers with mocked DB)
- Additional E2E scenarios (error cases, edge cases, multiple users)
- Performance tests (load testing, concurrent updates)

**Tradeoffs:**
- Not comprehensive coverage (but sufficient for demo)
- E2E tests are slower (but catch integration issues)
- Unit tests are fast (but don't catch API/DB integration bugs)

## 9. CI Strategy

**Decision:** Include both unit tests and E2E tests in GitHub Actions CI, with E2E running in a Postgres service container.

**Why:**
- **Unit tests** - Fast, catch logic bugs early
- **E2E tests** - Prove full system works, catch integration issues
- **Postgres service container** - Real database (not mocked), catches DB-specific issues
- **Artifact upload on failure** - Playwright reports and screenshots help debug failures

**Practical Tradeoffs:**
- **Runtime** - E2E tests are slower (but worth it for confidence)
- **Flakiness** - E2E tests can be flaky (but retries help)
- **Single browser** - Only Chromium (but covers most users, faster than multiple browsers)

**Future Improvements:**
- Parallel E2E tests (if test suite grows)
- Multiple browsers (Firefox, Safari) in CI
- Performance benchmarks

## 10. What I Would Do Next with More Time

### Database-Backed Auth
- Add `User` table with email, password hash, role
- Migrate from env-based to DB-backed auth
- Add password reset flow
- Session management UI (view active sessions, revoke tokens)

### Stricter Authorization
- Fine-grained permissions (e.g., "can only update own assigned enquiries")
- Resource-level access control
- Audit log viewing permissions

### Rate Limiting and Abuse Protection
- Rate limit public enquiry endpoints (per IP, per email)
- CAPTCHA for suspicious patterns
- Spam detection (keyword filtering, duplicate detection)

### More E2E Coverage
- Error cases (invalid login, expired session, unauthorized access)
- Edge cases (concurrent updates, large datasets)
- Multiple user scenarios (if multi-user auth is added)

### Deployment and Observability
- Dockerfile for containerized deployment
- Production environment configuration
- Logging and monitoring (structured logs, error tracking)
- Health check endpoints

### Seed Data and Fixtures
- Development seed script (sample enquiries)
- Test fixtures for consistent E2E tests
- Migration rollback testing

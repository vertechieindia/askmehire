# Project status — askmehire

**Last updated:** May 2026  
**Purpose:** Single place for **what is done** vs **what is pending** relative to the product vision (see [BRD.md](./BRD.md), [FSD.md](./FSD.md), [TDD.md](./TDD.md)). For **production gaps, roadmap, hardening, and exec-level planning**, see [PRODUCTION_MASTER_PLAN.md](./PRODUCTION_MASTER_PLAN.md).

> **Recent:** NextAuth (JWT credentials, Argon2), API auth middleware, server RBAC, **Jobs** tab wired to `GET /api/jobs` / `GET /api/applications`, and **Prepare application** calls `POST /api/applications` when the synced role matches `JOB_LISTINGS` (see `lib/job-catalog-match.ts`). ADR: [0003-nextauth-jwt-rbac.md](./adr/0003-nextauth-jwt-rbac.md).

Legend: **Done** = implemented in this repo in a runnable way. **Partial** = started but not production-complete. **Pending** = not implemented or only documented as contract.

---

## 1. Done (implemented)

### 1.1 Application shell and UX

- Next.js App Router app with home page hosting **`ProductionPortalApp`** (full portal: command, access, tenant, candidate, mail, ops, repository, jobs, billing, architecture tabs).
- Alternate **`LegitimatePartnerApp`** (subset UI) still in codebase.
- Role-aware navigation and permission helpers (`roleCan`, `PERMISSIONS`, `ROLE_LABELS`).
- **localStorage**-backed persistent UI state for demo workflows (profiles, selections, etc.).
- **NextAuth (v5 beta)** credentials sign-in with Argon2 password hashes in Postgres; JWT session carries `tenantId`, `role`, and `portalKey` (maps to portal UI user ids).
- **API authentication:** middleware JWT check on `/api/*` (except auth + health); optional **`AUTH_DEV_BYPASS`** for local tooling.

### 1.2 Seeded domain data

- Rich catalogs in `lib/catalog.ts`: intelligence components, job listings, applications, domains, technology timelines, skill taxonomy, role catalog, prompt versions, audit events, etc.
- Portal seeds: `PORTAL_TENANTS`, `PORTAL_USERS`, `COMPANY_ROLES`, `MAIL_THREADS`, `BILLING_LEDGER`, `ADMIN_REVIEW_QUEUE`, demo sign-in list.

### 1.3 Resume intelligence (deterministic)

- Full pipeline in `lib/resume-engine.ts`: JD canonicalization, skill extraction, role/domain detection, component ranking, timeline warnings, markdown assembly, multi-dimensional scoring, explainability, token estimates, skill gap detection.
- **`reviewComponentDraft`** for duplicate / similarity / intent / timeline checks on new drafts.

### 1.4 Job integrations (logic + demo data)

- Connector registry **`JOB_PORTAL_CONNECTORS`** (10 portals) with auth mode, apply mode, safety copy, refresh interval metadata.
- **`CandidateApplicationProfile`** defaults and **`syncJobsForCandidate`** with match scoring, blocklist exclusion, rotation over seeded listings, merge with existing roles.
- **`createAppliedRoleRecord`** for evidence-style applied-role payloads.

### 1.5 HTTP API routes

| Route | Behavior |
|-------|----------|
| `POST /api/generate` | Validates input (Zod); returns envelope + `ResumeGenerationResult` in `data` |
| `POST /api/resume-docx` | Validates input; returns DOCX binary or JSON error envelope |
| `POST /api/job-sync` | Syncs jobs (deterministic engine unchanged); envelope |
| `GET/POST /api/components` | **PostgreSQL** via Prisma repositories |
| `GET /api/jobs` | **PostgreSQL** search |
| `GET/POST /api/applications` | **PostgreSQL** persistence; POST requires `candidate:track_jobs`; list scoped by role |
| `GET /api/health` | DB liveness probe |
| `GET/POST /api/auth/*` | NextAuth handlers (JWT credentials) |

### 1.6 Client integration with APIs

- **`ProductionPortalApp`** calls `POST /api/generate` and `POST /api/resume-docx` and unwraps the JSON envelope for generation.
- **Jobs tab:** `GET /api/jobs`, `GET /api/applications`, and **Prepare →** `POST /api/applications` (when catalog match exists) with session cookies; optional `x-tenant-id` (UUID) when the session has a tenant.
- **Job connector grid** still uses **client-side** `localStorage` + `syncJobsForCandidate` for demo rotation; Postgres holds canonical **job index** and **applications** for matched flows.

### 1.7 Documentation (in repo)

- `README.md` — production-style Postgres setup, API envelope, health/worker notes.
- `docs/ARCHITECTURE.md` — product shape, pipeline, services, DB contract overview.
- `docs/BRD.md`, `docs/FSD.md`, `docs/TDD.md`, `docs/STATUS.md` (this file).
- **`docs/PRODUCTION_MASTER_PLAN.md`** — gap analysis, roadmap, hardening, exec summary, connectors, vectors, billing, email, CI/SOC2-oriented checklist, deployment and cost bands, Jira-style epics and estimates.
- `docs/MIGRATION_PLAN.md` — Phase 1 migration notes.
- `docs/adr/0001-prisma-postgres.md`, `docs/adr/0002-api-envelope.md`, `docs/adr/0003-nextauth-jwt-rbac.md`.

### 1.8 Database (PostgreSQL + Prisma)

- `prisma/schema.prisma` + `prisma/migrations/*` — authoritative DDL via Prisma Migrate.
- `database/schema.sql` — human-readable contract (aligned; additive columns documented in `docs/MIGRATION_PLAN.md`).
- `npm run db:seed` — hydrates bootstrap + Northstar tenants, portal users (with `portal_key` + password hashes), catalog jobs/components, and demo applications using deterministic UUIDs (`lib/ids/stable-uuid.ts`).

---

## 2. Partial (in progress or demo-only)

| Area | Current state | Gap |
|------|----------------|-----|
| **Persistence** | Prisma + Postgres for API-backed entities; portal UI still uses `localStorage` for connector profiles, mail drafts, billing mock, etc. | Move remaining UI state server-side where product requires audit trail |
| **Authentication** | NextAuth JWT credentials + seeded portal users; `AUTH_SECRET` required in production | No SSO/OAuth IdP yet; CSRF hardening for cookie sessions if needed |
| **Jobs API usage** | `GET /api/jobs` + search in **Jobs** tab; connector grid still deterministic client sync | Call `POST /api/job-sync` from UI; real external connectors |
| **Applications API usage** | `GET` + conditional **`POST`** from **Prepare** (catalog match + seeded resume FK path) | `PATCH`/`DELETE`, arbitrary resume rows per user, richer artifact paths |
| **Components API usage** | REST persists to DB | Admin Ops UI may still mirror some state client-side |
| **Connectors** | Full **metadata** and deterministic sync from seeds | No real Dice/Indeed/LinkedIn API or RSS integration |
| **Billing** | UI + seeded ledger | No Stripe/webhooks |
| **Email** | Mail thread UI + states | No SendGrid/SES/Gmail integration |
| **LLM** | Cost estimates and prompt version **catalog** | No live OpenAI/Anthropic calls in the documented engine path |
| **RBAC** | Client-side gating + **server** `requirePermission` on API routes | Fine-grained route matrix in docs/tests |

---

## 3. Pending (not done / production backlog)

### 3.1 Platform and security

- [ ] Add SSO/OAuth IdP (or keep credentials + harden) and externalize any remaining demo-only secrets.
- [ ] CSRF protection for cookie-based sessions if threat model requires it.
- [ ] Rate limiting: upgrade to **Redis-backed** limiter for multi-instance deployments (Phase 1 uses in-memory per Node).

### 3.2 Data and storage

- [ ] Move remaining **portal UI state** from `localStorage` into Postgres (profiles, runs, mail drafts, etc.).
- [ ] Implement embedding generation and storage (`pgvector`); similarity search for components and JDs; create IVFFlat indexes after sufficient data volume.
- [ ] Wire **upload/export** flows to S3/R2 using `getObjectStorage()` (adapter exists; callers in generation/export paths still needed).

### 3.3 Connectors and workers

- [ ] Implement real connector adapters (API, OAuth, RSS, or human-assisted capture) per portal ToS.
- [ ] Background job queue for sync, embedding refresh, and large generations.
- [ ] Per-tenant credential isolation and rotation.

### 3.4 Product depth

- [ ] Full email send/receive with approval workflow backed by provider.
- [ ] Stripe (or equivalent) subscriptions + metered billing tied to usage events.
- [ ] Admin Ops bulk loader writing to DB with validation and dry-run reports.
- [ ] PDF export, template gallery versioning, A/B on prompt routes (beyond static `PROMPT_VERSIONS` display).
- [ ] Optional: LLM-backed rewrite path with reviewer model and red-team prompts.

### 3.5 Quality engineering

- [ ] Unit tests for `resume-engine` and `job-integrations` (partial: `tests/rbac.test.ts`, `tests/job-catalog-match.test.ts` exist).
- [ ] API integration tests and Playwright E2E.
- [ ] CI pipeline (GitHub Actions): install, typecheck, test, build.

### 3.6 Observability

- [ ] OpenTelemetry, structured logging, dashboards for cost and connector health.

---

## 4. Quick health check (for PMs)

| Question | Answer today |
|----------|----------------|
| Can I run the app locally without API keys? | **Yes** (`npm install` / `npm run dev`) |
| Does resume generation require an LLM API key? | **No** (deterministic engine) |
| Is data saved to Postgres out of the box? | **Yes** if you run Postgres + `prisma migrate` + `db:seed` (see README). |
| Is the portal production-ready? | **No** — demo-style UI persistence, no billing/email providers, connectors are simulated |

---

## 5. Suggested next milestones

1. **M1 — Persistence:** ~~Postgres + Prisma + migrate seeds to DB read path~~ **Done (baseline).**
2. **M2 — Auth:** ~~Credentials JWT + tenant scoping on APIs~~ **Done (baseline).** Optional: Clerk/Auth0 SSO.
3. **M2b — UI ↔ API:** ~~Prepare → POST `/api/applications` (catalog-matched)~~ **Done (baseline).** Next: job-sync from refresh, more CRUD.
4. **M3 — One real connector:** One board (e.g., RSS or official API) end-to-end with stored jobs.
5. **M4 — Billing:** Stripe metered + usage events from generation/export.
6. **M5 — Hardening:** Tests, CI, Redis rate limits, observability dashboards.

---

*When you complete items, update this file or replace with a linked issue tracker (Linear/Jira) for single source of truth.*

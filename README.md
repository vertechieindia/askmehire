# askmehire

AI-powered Resume Intelligence Operating System for ATS-aligned, domain-aware resume generation, reusable component governance, job discovery, and application tracking.

## What is implemented

- Next.js app router product UI with super-admin sign-in, access control, tenant admin, candidate desk, email approvals, billing, repository, jobs, admin ops, and architecture screens.
- Role-based portal profiles for Super Admin, Tenant Company Admin, Individual Candidate, Admin Ops, Reviewer, Recruiter, and Tenant Candidate.
- Tenant company admin workflows for inviting candidates, creating company portal roles, and tracking employee usage.
- Candidate workflows for resume generation, job tracking, outreach drafts, incoming email reply drafts, approval-before-send, and individual usage billing.
- Job portal connector framework for Recruut, Dice, OPTnation, Techfetch, LinkedIn, Monster, Indeed, SimplyHired, ZipRecruiter, and CareerBuilder.
- One-minute job refresh in the portal using candidate job titles, locations, keywords, employment types, and candidate blocklisted words.
- Candidate primary application profile collection with reusable answers for repeated job applications.
- Applied-role evidence log storing portal, company, JD, link, recruiter email, resume used, resume snapshot, application payload, status, and response.
- Admin ops workflows for reusable component creation, duplicate detection, review, approval, rejection, publishing, domain management, and technology management.
- Admin ops verified-data bulk loader for keyword/tool/skill, job titles, timeline, domains, and 1 to 1000 role/domain responsibility bullets.
- Deterministic resume intelligence engine for JD canonicalization, role detection, domain mapping, skill normalization, component retrieval, timeline checks, scoring, and explainability.
- API routes for resume generation, reusable component review, job discovery, and application tracking.
- Seeded role catalog, domain profiles, technology timelines, reusable resume components, jobs, applications, prompt versions, and audit events.
- Production database contract in `database/schema.sql` (kept in sync with Prisma; additive columns documented in `docs/MIGRATION_PLAN.md`).
- Architecture notes in `docs/ARCHITECTURE.md`.
- Phase 1 production foundation: Prisma + PostgreSQL repositories, service layer, Zod validation, API envelope, rate limiting, OpenTelemetry hook, BullMQ enqueue bridge, S3 storage adapter, Docker assets (`Dockerfile`, `docker-compose.yml`), and `docs/MIGRATION_PLAN.md` + ADRs.

## Production-style local setup (PostgreSQL)

1. Copy `.env.example` to `.env` and set secrets for your environment.
2. Start dependencies:

```bash
docker compose up -d postgres redis
```

3. Apply migrations and seed catalog-backed rows:

```bash
npx prisma migrate deploy
npm run db:seed
```

4. Run the app:

```bash
npm run dev
```

JSON API responses use `{ success, data, error, requestId }`. The UI unwraps this automatically for resume generation. Until Phase 2 auth ships, set `DEFAULT_TENANT_ID` to the UUID printed at the end of `npm run db:seed` (also shown in `.env.example` for the bootstrap tenant).

### Health & workers

- `GET /api/health` — liveness + database probe.
- Async worker entry: `npm run worker` (requires `REDIS_URL`; processes the default BullMQ queue).

## Run locally (UI-only / without Docker)

You still need a reachable `DATABASE_URL` for API routes that persist data. For a quick UI spin without Postgres, the portal continues to use `localStorage`, but `/api/*` calls that hit the database will fail until Postgres is available.

```bash
npm install
npm run dev
```

## Seeded sign-in accounts

```text
Super Admin: superadmin@askmehire.com / Askmehire@123
Tenant Admin: admin@northstarrecruiting.com / Tenant@123
Individual Candidate: alex.morgan@example.com / Candidate@123
Admin Ops: ops@askmehire.com / Ops@123
```

## API routes

JSON routes return an envelope: `{ success, data, error, requestId }`. `POST /api/resume-docx` returns binary on success and JSON errors using the same envelope.

```text
POST /api/generate
POST /api/job-sync
GET  /api/components
POST /api/components
GET  /api/jobs
GET  /api/applications
POST /api/applications
GET  /api/health
```

Persistence is backed by PostgreSQL via Prisma. The interactive portal still persists demo workflow state in browser `localStorage` until Phase 3 moves that state server-side.

Production deployment should add managed authentication, an email provider, payment provider, Redis-backed rate limits (for multi-instance), and object storage for large artifacts.

The connector layer is intentionally API-first and human-assisted. It prepares safe searches and application payloads, avoids aggressive hidden automation, and keeps each portal account isolated so one connector issue does not risk every user account.

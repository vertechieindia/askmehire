# askmehire — data & architecture migration plan (Phase 1)

This document describes how the codebase moved from **in-memory API stores** to **PostgreSQL + Prisma**, and how to roll forward/back safely.

## What changed

- **Prisma ORM** models mirror `database/schema.sql` (with additive fields: `components.tags`, `applications.ats_score`, `applications.realism_score`).
- **Initial SQL migration** lives in `prisma/migrations/20260512120000_init/migration.sql` (includes `CREATE EXTENSION vector;`).
- **Seed** (`prisma/seed.ts`) loads catalog-backed rows (tenant, users, roles, domains, technologies, components, jobs, resumes, applications) using deterministic UUIDs (`lib/ids/stable-uuid.ts`).
- **API routes** are thin controllers; **services** and **repositories** own orchestration and persistence.
- **JSON API envelope** (`success`, `data`, `error`, `requestId`) is returned from JSON routes; clients unwrap via `lib/http/unwrap-api.ts`.

## Local bootstrap

1. Copy `.env.example` → `.env` and adjust secrets.
2. `docker compose up -d postgres redis` (or use a managed Postgres with pgvector).
3. `npx prisma migrate deploy`
4. `npm run db:seed`
5. `npm run dev`

## Rollback

- **Application rollback:** deploy previous image/commit; APIs that expect the envelope must match client version.
- **Database rollback:** restore from snapshot taken before `prisma migrate deploy`, or apply a down migration you author (Prisma does not auto-generate destructive downs).

## Follow-up phases (recommended order)

1. **Phase 2 — Auth:** ~~Replace anonymous `DEFAULT_TENANT_ID` usage with sessions; enforce RBAC on routes~~ **Done (baseline):** NextAuth JWT credentials, middleware, `prepareApiContext`, `requirePermission`. Optional: SSO IdP.
2. **Phase 2b — UI ↔ API:** ~~Jobs/applications read + prepare POST~~ **Partially done:** `GET /api/jobs`, `GET/POST /api/applications` from portal; connector demo still client-side.
3. **Phase 3 — Persistence breadth:** Move remaining `localStorage` portal state to Postgres; wire embeddings workers.
4. **Phase 4 — Connectors:** Replace seeded sync with real integrations + watermarks.

See [adr/0003-nextauth-jwt-rbac.md](./adr/0003-nextauth-jwt-rbac.md) for auth/RBAC decisions.

## Risks

- **Multi-instance rate limiting:** current limiter is in-memory per Node process; use Redis-backed limiter in production.
- **IVFFlat vector indexes:** commented in initial migration; create after sufficient rows and `ANALYZE`.

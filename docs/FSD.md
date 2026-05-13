# Functional Specification Document (FSD)

**Product:** askmehire  
**Document version:** 1.1  
**Last updated:** May 2026  
**Related:** [BRD.md](./BRD.md), [TDD.md](./TDD.md), [STATUS.md](./STATUS.md)

---

## 1. Purpose

This document specifies **observable product behavior**: actors, features, data objects, user flows, and acceptance-style criteria. Where behavior exists only as **UI + local state + seeds**, it is labeled **Demo**. Where behavior is backed by **API routes and server logic**, it is labeled **Implemented API**. Target production behavior aligned with `database/schema.sql` is labeled **Contract** when not yet wired end-to-end.

---

## 2. Actors and permissions

Roles are defined in code (`PortalRole` in `lib/portal.ts`). Permission strings exist per role; the **portal UI** uses `roleCan`, and **JSON API routes** enforce `requirePermission` / `roleHasPermission` (`lib/auth/rbac.ts`) on top of authenticated `ApiContext`.

| Role | Key capabilities (functional) |
|------|--------------------------------|
| `SUPER_ADMIN` | Full platform, tenants, users, billing, admin ops management, impersonation read. |
| `TENANT_COMPANY_ADMIN` | Tenant users/roles, usage, candidate resume/jobs, email approval, tenant billing view. |
| `INDIVIDUAL_CANDIDATE` | Resume generation, job tracking, email draft/request approval, self billing. |
| `ADMIN_OPS` | Components lifecycle, domains, technologies, duplicates, timeline, analytics, bulk loader. |
| `REVIEWER` | Component review, email approve, analytics. |
| `RECRUITER` | Generate/track for candidates, email draft. |
| `TENANT_CANDIDATE` | Same core candidate capabilities under tenant (no self-billing permission in matrix). |

**Implemented (baseline):** Sign-in uses **NextAuth Credentials** against Postgres `users` (Argon2 hashes from `npm run db:seed`). `SIGN_IN_USERS` remains the UX quick-pick list; production may replace with SSO (Clerk/Auth0, etc.).

---

## 3. Global requirements

### 3.1 Non-functional (product-facing)

- **NFR-1:** Primary UI loads as a single-page style **portal** with persistent navigation between major modules.
- **NFR-2:** Resume generation must return **structured result** (markdown, scores, warnings, explainability, cost estimates).
- **NFR-3:** Job sync responses must include **match score**, **exclusion** when blocklist hits, and **safe apply mode** per portal policy.
- **NFR-4:** Demo deployments may persist workflow state in **browser localStorage**; production must persist to **database** per contract.

### 3.2 Strategies (resume)

User-selectable generation strategy (`ResumeGenerationRequest.strategy`):

- `ATS-heavy`, `recruiter-readable`, `consulting-style`, `contract-focused`, `federal-focused`

**Acceptance:** Strategy is accepted by API and influences summary/positioning language in the deterministic engine.

---

## 4. Feature modules

### 4.1 Authentication and session

**Implemented API (baseline)**

- **NextAuth** (`auth.ts`, `app/api/auth/[...nextauth]/route.ts`): JWT session with `role`, `tenantId`, `portalKey`; credentials provider validates email/password via Prisma + Argon2; lockout and login audit hooks.
- **Middleware** requires a JWT cookie on `/api/*` except `/api/auth/*` and `/api/health` (optional `AUTH_DEV_BYPASS` in dev/test).
- **Portal UI:** `SessionProvider`; after sign-in, `portalKey` maps to `PORTAL_USERS` for tabs and `roleCan`.

**Demo / residual**

- Rich portal state (mail threads, billing lines, some ops views) still **localStorage**-backed.

**Acceptance (production target)**

- OAuth or enterprise SSO via managed IdP; HTTP-only session hardening; CSRF strategy for cookie-authenticated mutating requests where required.

---

### 4.2 Command center / dashboard

**Demo**

- Role-aware landing metrics (usage, approvals, spend) from seeded `PortalUser.usage` and related catalog data.

**Acceptance**

- Widgets reflect **real** aggregates from database and time range filters.

---

### 4.3 Tenant administration

**Demo**

- Tabs: tenant overview, candidates, templates, usage.
- CRUD-style presentation for tenants, company roles, invitations (state held in localStorage where implemented in UI).

**Acceptance**

- All mutations persist to `tenants`, `users`, `company_roles` per schema; audit events recorded.

---

### 4.4 Candidate desk

**Demo**

- Resume form (source resume + JD + strategy), run generation, view scores, explainability, warnings, skill gaps.
- Job list from sync, saved/prepared/applied flows, applied-role evidence list.
- Mail threads with draft / approval_requested / approved / sent states.
- Billing ledger line items for individual usage.

**Implemented API**

- `POST /api/generate` — runs resume generation server-side (`candidate:generate_resume`).
- `POST /api/resume-docx` — builds DOCX from `CandidateResumeInput` (`candidate:generate_resume`).
- `POST /api/job-sync` — runs `syncJobsForCandidate()` (`candidate:track_jobs`).
- `GET /api/jobs` — Postgres search (`q`, `domain`) (`candidate:track_jobs`).
- `GET /api/applications` — list for tenant/user per RBAC (`candidate:track_jobs`).
- `POST /api/applications` — create row for signed-in user (`candidate:track_jobs`); portal **Prepare** persists when `SyncedRole` matches `JOB_LISTINGS` (`lib/job-catalog-match.ts`).

**Acceptance**

- Generation and exports are idempotent per request version where applicable; **canonical** jobs and applications live in Postgres; connector **demo rotation** may remain client-side until real connectors land.

---

### 4.5 Resume intelligence engine

**Implemented (deterministic, server-side)**

1. **JD canonicalization** — de-duplicate lines, strip common boilerplate patterns.
2. **Skill extraction** — taxonomy + technology timelines + heuristics.
3. **Role detection** — catalog match with JD + optional target title.
4. **Domain detection** — domain profiles and vocabulary signals.
5. **Component retrieval** — rank `INTELLIGENCE_COMPONENTS` (approved/published), role family, domain, skills, JD token overlap.
6. **Timeline warnings** — source resume + JD years vs. technology validity windows.
7. **Assembly** — markdown resume: summary, skill matrix, experience scaffolding, validation notes.
8. **Scoring** — ATS, human realism, domain authenticity, timeline integrity, uniqueness, skill gap closure.
9. **Explainability** — string list describing classifier, domain, skills, retrieval, scoring.
10. **Cost governance** — baseline vs. optimized token estimates, route label, reuse ratio.

**Acceptance**

- For JD shorter than 40 characters, `POST /api/generate` returns **400** with clear error (implemented).

---

### 4.6 Repository (read-only catalog in code)

**Demo**

- Display `INTELLIGENCE_COMPONENTS`, domains, technologies, timelines, prompt versions, audit events from `lib/catalog.ts`.

**Acceptance**

- Editable through Admin Ops with API + DB backing; embeddings populated for similarity.

---

### 4.7 Jobs and connectors

**Demo**

- Connector registry `JOB_PORTAL_CONNECTORS` with auth mode, apply mode, status, safety controls.
- Synced roles: scoring from profile vs. seeded listings; blocklist sets status `excluded`; rotation simulates refresh (client + `localStorage`).

**Implemented API**

- `POST /api/job-sync` — accepts profile (+ optional user fallback profile builder); returns envelope (deterministic engine).
- `GET /api/jobs` — **PostgreSQL** search by `q` / `domain`; used from **Jobs** tab (session + optional `x-tenant-id` UUID).

**Acceptance**

- Production connectors ingest real listings; dedupe by portal + company + title + location; rate limits enforced server-side; optional wiring of `POST /api/job-sync` from the same tab.

---

### 4.8 Application tracking

**Demo**

- **Applied role evidence** (prepared/applied UI rows) still merges local `AppliedRoleRecord` state for the full connector story.

**Implemented API**

- `GET /api/applications`, `POST /api/applications` — **PostgreSQL** via Prisma; list scoped by role (tenant admin vs. candidate); **Prepare** posts when catalog match + seeded resume legacy id resolve to existing rows.

**Acceptance**

- Artifact paths in object storage; `PATCH`/`DELETE` and non-catalog prepares covered by future work.

---

### 4.9 Admin Ops

**Demo**

- Sub-tabs: overview, components, approvals, domains, technologies, duplicates, timeline, AI content review, analytics, bulk loader.
- Component draft review via `reviewComponentDraft()` in UI flows.

**Implemented API**

- `GET /api/components`, `POST /api/components` — **PostgreSQL** with `reviewComponentDraft` on create; permissions per route (`analytics:view` / `components:create` / `components:approve` matrix on GET).

**Acceptance**

- Full lifecycle: draft → similarity_scan → review → approved → published → retired; bulk loader imports to DB with validation jobs.

---

### 4.10 Billing

**Demo**

- Ledger items, cents formatting, tenant limits vs. spend (seeded).

**Acceptance**

- Stripe (or equivalent) subscriptions + metered usage; webhook-driven ledger.

---

### 4.11 Architecture screen

**Demo**

- Static/reference content summarizing runtime modules and services (aligned with `docs/ARCHITECTURE.md`).

---

## 5. Alternate UI surface

`components/LegitimatePartnerApp.tsx` provides a **subset** portal (studio/repository/jobs/admin) and calls `POST /api/generate` with session cookies (requires sign-in on the main portal or `AUTH_DEV_BYPASS` in dev). The **primary** product surface is `ProductionPortalApp.tsx` mounted from `app/page.tsx` (wrapped with `SessionProvider` in `components/providers.tsx`).

---

## 6. External interfaces (summary)

| Interface | Direction | Spec detail |
|-----------|-----------|-------------|
| `POST /api/generate` | Client → Server | JSON `ResumeGenerationRequest` → `ResumeGenerationResult` |
| `POST /api/resume-docx` | Client → Server | JSON `CandidateResumeInput` → DOCX binary |
| `POST /api/job-sync` | Client → Server | profile + optional existing roles + cycle → refreshed `SyncedRole[]` |
| `GET/POST /api/components` | Client ↔ Server | Component list/create + review metadata (RBAC) |
| `GET /api/jobs` | Client → Server | Query params `q`, `domain` (Postgres) |
| `GET/POST /api/applications` | Client ↔ Server | List / create application records (Postgres, RBAC) |
| `GET/POST /api/auth/*` | Browser ↔ Server | NextAuth JWT session |

JSON routes return the **API envelope** (`success`, `data`, `error`, `requestId`); clients unwrap via `lib/http/unwrap-api.ts` (`fetchApiEnvelope` for authenticated fetches).

Full request/field validation rules live in `validators/api-schemas.ts` and `app/api/**/route.ts`.

---

## 7. Acceptance criteria summary (release-ready product)

1. ~~Real authentication and tenant isolation on all JSON APIs.~~ **Baseline done** (extend with SSO + CSRF as needed).
2. ~~PostgreSQL persistence for components, jobs, applications.~~ **Done** (other entities still partial).
3. No production secrets or demo passwords in source; rotate any leaked credentials; use vault for connector tokens.
4. Connector workers with queue, backoff, and per-tenant credentials vault.
5. Observability: structured logs, tracing, and cost dashboards for LLM routes when enabled.
6. Export pipeline stores blobs in object storage and references paths in DB.

---

## 8. Traceability

| BRD theme | FSD sections |
|-----------|----------------|
| Governed content | 4.6, 4.9 |
| Resume quality | 4.5 |
| Jobs / applications | 4.7, 4.8 |
| Multi-tenant ops | 4.3, 4.1, 4.2 |
| Commercial | 4.10 |

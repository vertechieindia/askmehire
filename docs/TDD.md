# Technical Design Document (TDD)

**Product:** askmehire  
**Document version:** 1.1  
**Last updated:** May 2026  
**Note:** In this package, **TDD** means **Technical Design Document** (not “test-driven development”).  
**Related:** [FSD.md](./FSD.md), [STATUS.md](./STATUS.md), [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 1. System context

```text
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React client)                 │
│  ProductionPortalApp (primary) | LegitimatePartnerApp      │
│  SessionProvider (next-auth/react) + localStorage (demo)    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + cookies
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js (App Router) — Node runtime           │
│  middleware.ts — JWT on /api/* (except auth + health)     │
│  app/api/auth/[...nextauth] | generate | job-sync | …       │
│  lib/http/with-api-handler — prepareApiContext + RBAC     │
│  lib/resume-engine | job-integrations | prisma repositories │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL + pgvector | Object storage | Queue | IdP |   │
│  Email provider | Stripe | External LLMs / search APIs     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology stack

| Layer | Technology | Version note |
|-------|------------|----------------|
| Framework | Next.js (App Router) | `package.json`: `"next": "latest"` |
| Language | TypeScript | `latest` |
| UI | React 19 | `latest` |
| Icons | lucide-react | `latest` |
| DOCX | docx | ^9.6.1 |
| Styling | Inline / component-level (no separate CSS framework in package.json) | — |

Scripts: `dev`, `build`, `start`, `typecheck`, `test` (Vitest).

---

## 3. Repository layout (engineering)

| Path | Responsibility |
|------|------------------|
| `app/layout.tsx` | Root layout + `SessionProvider` (`components/providers.tsx`) |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth route handlers |
| `auth.ts` | NextAuth configuration (credentials, JWT callbacks) |
| `middleware.ts` | Security headers + JWT gate for `/api/*` |
| `lib/http/with-api-handler.ts` | API envelope helpers, `prepareApiContext`, rate-limit hook |
| `lib/auth/rbac.ts` | `requirePermission` / `roleHasPermission` |
| `lib/prisma.ts` | Prisma client singleton |
| `prisma/schema.prisma` | ORM models + migrations |
| `app/page.tsx` | Renders `ProductionPortalApp` |
| `app/api/*/route.ts` | HTTP handlers (REST-style JSON + binary export) |
| `components/ProductionPortalApp.tsx` | Full portal UI (~2900+ lines) |
| `lib/types.ts` | Shared domain types |
| `components/LegitimatePartnerApp.tsx` | Alternate streamlined UI |
| `lib/http/unwrap-api.ts` | Envelope unwrap + `fetchApiEnvelope` for authenticated fetches |
| `lib/job-catalog-match.ts` | Map connector `SyncedRole` → `JOB_LISTINGS` id for API writes |
| `lib/catalog.ts` | Seeded catalogs (roles, domains, components, jobs, audits, …) |
| `lib/resume-engine.ts` | Deterministic pipeline + `reviewComponentDraft` |
| `lib/job-integrations.ts` | Connectors, profiles, `syncJobsForCandidate`, applied-role factory |
| `lib/portal.ts` | Tenants, users, RBAC matrix, billing/mail seeds |
| `lib/resume-inputs.ts` | Candidate resume templates / DOCX content builder |
| `validators/api-schemas.ts` | Zod schemas shared by routes |
| `database/schema.sql` | Human-readable PostgreSQL + pgvector DDL |

---

## 4. Core algorithms (resume engine)

### 4.1 Normalization and tokenization

- Lowercase, strip punctuation to spaces, collapse whitespace (`normalize`).
- Tokenization removes short tokens and a fixed **stop word** set (`tokenize`).

### 4.2 JD canonicalization

- Split on newlines; trim; drop lines matching boilerplate regexes (EEO, background check, etc.); dedupe by normalized line key (`canonicalizeJD`).

### 4.3 Skill extraction

- Iterate `SKILL_TAXONOMY` aliases, `TECHNOLOGY_TIMELINES` aliases, plus regex heuristics for SQL, REST, lineage (`extractSkills`).

### 4.4 Role and domain classification

- **Domain:** score `DOMAIN_PROFILES` signals; tie-break with `SUPPORTED_DOMAINS` (`detectDomain`).
- **Role:** optional exact match on target title against `ROLE_CATALOG`; else weighted token overlap and role-family regex hints (`detectRole`, `roleScore`).

### 4.5 Component retrieval

- Filter: status in `{approved, published}`, domain compatible (domain match or `"Technology"`), role family / technology / achievement rules (`rankComponents`).
- Score: quality, freshness, deprecation, role match, domain match, skill match, tag/JD overlap; take top set with fallback thresholds.

### 4.6 Assembly

- Builds markdown sections: header, professional summary bullets, skill matrix from `SECTION_SKILL_GROUPS`, experience scaffold (business problem, contributions, responsibilities, achievements, environment), validation notes (`assembleResume`).

### 4.7 Scoring

- Heuristic formulas for each dimension in `buildScores` (keyword coverage, bullet structure, buzzwords, domain signal hits, bullet similarity, skill coverage, timeline warning penalty).

### 4.8 Cost governance (estimated)

- `estimateTokens` ~ chars/4; compares full JD+resume baseline vs. canonical JD + selected component text + constant overhead; `reuseRatio` derived from selected component count.

### 4.9 Component draft review (Admin Ops helper)

- Exact duplicate on normalized `baseLogic`; best semantic `tokenOverlap`; intent collision on role+technology+domain+intent; technology timeline vs. draft start/end (`reviewComponentDraft`).

---

## 5. Job sync algorithm

`syncJobsForCandidate(profile, existing, cycle)`:

1. Build per-portal `safeApplyMode` map from `JOB_PORTAL_CONNECTORS`.
2. Rotate seeded `SEEDED_PORTAL_ROLES` by `cycle % length` to simulate refresh variety.
3. For each seed: compute `scoreRole` from job titles, locations, keywords, employment types; compute blocklist `exclusionHits`; set `matchScore` to 0 if excluded; stable id from `userId`, portal, company, title; merge with `existing` roles; dedupe by id in a `Map`; sort by `matchScore` descending.

**Production replacement:** Replace rotation with connector-specific fetchers, dedupe keys, and persisted cursor/watermark per tenant/user.

---

## 6. API design

### 6.1 `POST /api/generate`

- **Body:** `ResumeGenerationRequest`
- **Validation:** `jobDescription` required, trimmed length ≥ 40 → else 400
- **Response:** JSON **envelope** with `ResumeGenerationResult` in `data` on success (`lib/http/api-envelope.ts`).
- **Errors:** 4xx/5xx with `{ success: false, error: { code, message }, requestId }` for JSON routes.

### 6.2 `POST /api/resume-docx`

- Accepts `CandidateResumeInput` (see `lib/resume-inputs.ts` and route handler for exact validation).
- Returns `application/vnd.openxmlformats-officedocument.wordprocessingml.document` using `docx` `Packer.toBuffer`.

### 6.3 `POST /api/job-sync`

- **Body:** `{ profile?: CandidateApplicationProfile; user?: {...}; existing?: SyncedRole[]; cycle?: number }`
- Requires resolvable profile (explicit or from `user` via `buildDefaultProfileForUser`)
- **Response:** `{ refreshedAt, refreshEverySeconds, jobs, excluded }`

### 6.4 `GET /api/components` / `POST /api/components`

- **Auth:** JWT session required (or dev bypass). GET requires analytics/components permissions matrix; POST requires `components:create`.
- GET: Prisma-backed list + aggregate counts by status.
- POST: validates required fields; runs `reviewComponentDraft`; persists draft/review component.

### 6.5 `GET /api/jobs`

- Query: `q`, `domain`; **Prisma** `JobRepository.search` for tenant from `ApiContext`.

### 6.6 `GET` / `POST /api/applications`

- **Auth:** JWT + `candidate:track_jobs`.
- GET: tenant-scoped list (full tenant for `tenant:manage_users` / `platform:full`, else current user).
- POST: `jobId` / `resumeId` (legacy or UUID resolved in repository); creates `applications` row for `ctx.userId`.

---

## 7. Data model

### 7.1 Implemented (runtime)

- **Client:** arbitrary JSON in **localStorage** (keys defined in `ProductionPortalApp` hooks) for demo-only portal chrome.
- **Server:** **PostgreSQL** via Prisma for tenants, users, components, jobs, applications, resumes, audit events, and related entities per `prisma/schema.prisma` and migrations.

### 7.2 Contract (PostgreSQL)

`database/schema.sql` defines normalized tables including:

- `tenants`, `users`, `company_roles`
- `roles`, `domains`, `technologies`, `components` (with `VECTOR(1536)`)
- `resumes`, `resume_component_uses`
- `jobs`, embeddings, JD hash fields
- Additional tables for applications, mail, billing, audit (see full file for complete DDL)

**Embedding dimensions** assume 1536-dim vectors (OpenAI-class); change if model vendor differs.

---

## 8. Security design

### 8.1 Current risks (residual)

- Demo **password list** in `SIGN_IN_USERS` is for UX parity; **production** must rotate hashes, remove shared secrets from docs, and prefer SSO.
- Cookie sessions without explicit **CSRF** tokens on JSON POST (mitigate with SameSite, origin checks, or future CSRF strategy).
- **`AUTH_DEV_BYPASS`** must never be enabled in production.

### 8.2 Production targets

- **Auth:** ~~Clerk, Auth0, or custom JWT + HTTP-only cookies~~ **Baseline:** NextAuth JWT + credentials; tenant id in session claims; optional upgrade to managed IdP.
- **Authorization:** ~~Server-side enforcement per route~~ **Baseline:** `requirePermission` in route handlers + `ApiContext` tenant/user resolution.
- **Secrets:** Environment variables / vault; OAuth tokens per connector in isolated secrets.
- **Prompt injection:** JD text must not be concatenated into system prompts without sanitization boundary (see ARCHITECTURE safety list).
- **Transport:** TLS everywhere; HSTS at edge.

---

## 9. Observability and operations

- Add OpenTelemetry traces around generation and connector jobs.
- Log correlation ids: `tenantId`, `userId`, `resumeId`, `jobId`.
- Metrics: latency, error rate, token usage, cost per tenant.

---

## 10. Deployment

Reference target from `ARCHITECTURE.md`:

- **Frontend:** Vercel (or equivalent)
- **API / workers:** ECS or Kubernetes
- **Database:** RDS PostgreSQL + pgvector
- **Queue:** Redis (or Temporal)
- **Storage:** S3 or R2

**Build:** `next build` produces standalone server output per Next defaults.

---

## 11. Future service decomposition

Logical bounded contexts (may become separate deployables):

Resume Orchestration, JD Analysis, Resume Intelligence, Similarity, Timeline Validation, Domain Mapping, Job Aggregation, Application Tracking, Export Rendering, Audit/Compliance, Identity/Tenant, Email Workflow, Billing/Metering, Job Connector, Candidate Application Profile, Applied Role Evidence.

---

## 12. Testing strategy (recommended)

| Layer | Suggestion |
|-------|------------|
| Unit | Pure functions in `resume-engine.ts`; RBAC + job-catalog matchers (`tests/*.test.ts`) |
| API | Route integration tests (recommended); assert 401/403/400 paths |
| E2E | Playwright: sign-in, run generation, download DOCX |
| Contract | SQL migrations vs. `schema.sql`; pgvector index health |

*Vitest unit tests exist for RBAC and job-catalog matching; broader coverage is still recommended.*

---

## 13. Open technical decisions

- Vector embedding model and refresh cadence for components and JDs.
- Whether generation remains synchronous or moves to queued jobs for large documents.
- Multi-region data residency for EU tenants.

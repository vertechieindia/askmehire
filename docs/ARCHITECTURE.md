# askmehire Architecture

## Product shape

askmehire is implemented as a resume intelligence operating system, not a one-shot resume generator. The first production slice focuses on controlled generation, reusable content governance, deterministic validators, explainability, and application tracking.

The portal layer now adds sign-in, RBAC, tenant administration, individual candidate billing, admin ops workflows, email approval states, and usage attribution.

Job discovery now runs through a connector registry covering Recruut, Dice, OPTnation, Techfetch, LinkedIn, Monster, Indeed, SimplyHired, ZipRecruiter, and CareerBuilder. The current local implementation refreshes matched jobs every minute from verified seeded connector data. Production adapters should replace that seeded data with API, RSS/search, or safe human-assisted browser connector sources.

## Runtime modules

```text
Next.js Frontend (React)
  -> SessionProvider + ProductionPortalApp
  -> API Routes (JSON envelope + binary resume-docx)
  -> NextAuth (JWT credentials) + middleware (JWT on /api/*)
  -> Prisma repositories + services (PostgreSQL)
  -> Deterministic resume-engine + job-integrations (catalog + connector demo)
```

PostgreSQL holds tenants, users (with `portal_key`, password hash), components, jobs, applications, resumes, audit events, etc. The **connector job grid** in the UI still merges deterministic `syncJobsForCandidate` output with **optional** reads from `GET /api/jobs` for the canonical index.

## Resume intelligence pipeline

1. JD canonicalization removes repeated lines and common non-signal boilerplate.
2. Skill taxonomy maps aliases such as Kafka, Confluent Kafka, and Kafka Streams into canonical skills.
3. Role classifier maps title and JD language into the master role catalog.
4. Domain mapper scores industry systems, datasets, compliance terms, and domain vocabulary.
5. Component retrieval ranks approved repository content by role, role family, domain, technology, intent, quality, and freshness.
6. Timeline validation checks technology maturity windows against source text.
7. Resume assembly builds a controlled draft from reusable content and targeted JD patches.
8. Scoring evaluates ATS coverage, human realism, domain authenticity, timeline integrity, uniqueness, and skill gap closure.
9. Explainability records why each component and classification decision was selected.

The resume pipeline is still verified-database first. Admin ops can load keyword/tool/skill intelligence by job title, timeline, domain, and up to 1000 role/domain bullets. Generation should use this approved repository first; only missing gaps route through the prompt engine and external LLMs.

## Production services

The app is structured so these services can be split out without changing product behavior:

- Resume Orchestration Service
- JD Analysis Service
- Resume Intelligence Service
- Similarity Service
- Timeline Validation Service
- Domain Mapping Service
- Job Aggregation Service
- Application Tracking Service
- Export Rendering Service
- Audit and Compliance Service
- Identity and Tenant Service
- Email Workflow Service
- Billing and Metering Service
- Job Connector Service
- Candidate Application Profile Service
- Applied Role Evidence Service

## Data architecture

The production database is PostgreSQL with pgvector. Separate embeddings are planned for:

- Job descriptions
- Resume bullets
- Business problems
- Environments
- Achievements
- Summaries

Object storage stores exported resumes, JD snapshots, and cover letters. Database records retain metadata, audit events, scores, status transitions, and storage paths.

## Cost governance

The implemented engine estimates a baseline full-generation token path and an optimized patch path. Production routing should use:

- Cheaper model for simple rewrites
- Primary reasoning model for complex generation and validation
- Reviewer model for naturalness and anti-pattern review
- Long-context fallback for very large resume or JD parsing

## Safety controls

- No generated draft should assign modern tools to older roles without timeline validation.
- Synthetic metrics should be reviewed before export.
- Prompt injection text in JDs should be sanitized and never merged into system instructions.
- Connector automation should remain human-assisted and rate-limited.
- Low-confidence generations should route to human QA.
- Portal connectors must not perform aggressive auto-apply flows. They should use API/OAuth where available, isolate credentials by account, apply per-portal rate limits, and require human confirmation before submitting sensitive information.

## Job refresh and application evidence

```text
Every 60 seconds
  -> load candidate application profile
  -> search connected portals by job titles, target locations, keywords, and employment type
  -> exclude blocklisted words before display
  -> dedupe by portal, company, title, and location
  -> save prepared/applied role evidence
```

Each applied role record stores portal, company, title, JD, link, recruiter email, resume used, resume snapshot, application payload, status, and response.

## Role model

```text
Super Admin
  - creates tenant company admins, individual candidates, and admin ops users
  - sees all tenants, users, billing, and governance queues

Tenant Company Admin
  - creates company candidate profiles
  - manages company portal roles
  - tracks employee usage and tenant spend
  - approves candidate email drafts

Individual Candidate
  - generates resumes
  - tracks jobs and applications
  - drafts outreach and replies
  - pays for metered usage

Admin Ops
  - creates and reviews reusable resume components
  - manages domains, technologies, duplicate detection, timeline validation, analytics, and publishing
```

## Production adapter boundaries

The current app is runnable without external credentials. For production hardening, extend or replace the baseline below:

- **Auth:** NextAuth JWT credentials + Argon2 are implemented; consider **Clerk, Auth0, or enterprise SSO** and stricter cookie/CSRF policy.
- **Database:** PostgreSQL with pgvector using `database/schema.sql` / Prisma migrations
- Email: Gmail/Outlook connector, SendGrid, Postmark, or SES
- Billing: Stripe subscriptions and metered billing
- Queues: Redis or Temporal-backed async orchestration
- Storage: S3 or Cloudflare R2 for DOCX/PDF/JD artifacts

## Deployment target

```text
Frontend: Vercel
API/services: AWS ECS or Kubernetes
Database: AWS RDS PostgreSQL with pgvector
Queue: Redis
Storage: S3 or Cloudflare R2
Observability: OpenTelemetry plus AI cost and failure dashboards
```

For phased delivery, gap analysis, and cost bands, see [PRODUCTION_MASTER_PLAN.md](./PRODUCTION_MASTER_PLAN.md).

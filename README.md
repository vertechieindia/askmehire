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
- Production database contract in `database/schema.sql`.
- Architecture notes in `docs/ARCHITECTURE.md`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If port `3000` is busy, run:

```bash
npm run dev -- --port 3001
```

## Seeded sign-in accounts

```text
Super Admin: superadmin@askmehire.com / Askmehire@123
Tenant Admin: admin@northstarrecruiting.com / Tenant@123
Individual Candidate: alex.morgan@example.com / Candidate@123
Admin Ops: ops@askmehire.com / Ops@123
```

## API routes

```text
POST /api/generate
POST /api/job-sync
GET  /api/components
POST /api/components
GET  /api/jobs
GET  /api/applications
POST /api/applications
```

The current implementation uses in-memory seeded data. The database schema is ready for PostgreSQL plus pgvector.

The interactive portal persists demo workflow state in browser localStorage. Production deployment should wire the same models to the PostgreSQL schema, managed authentication, an email provider, payment provider, queue, and object storage.

The connector layer is intentionally API-first and human-assisted. It prepares safe searches and application payloads, avoids aggressive hidden automation, and keeps each portal account isolated so one connector issue does not risk every user account.

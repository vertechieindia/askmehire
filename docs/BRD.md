# Business Requirements Document (BRD)

**Product:** askmehire  
**Organization:** Ver-Techie  
**Repository:** https://github.com/Ver-Techie/askmehire  
**Document version:** 1.0  
**Last updated:** May 2026  

---

## 1. Executive summary

askmehire is positioned as an **AI-powered resume intelligence operating system**: not a one-off resume generator, but a governed platform for ATS-aligned resume drafting, reusable content management, job discovery, application evidence, and multi-tenant operations with billing and compliance-minded controls.

This BRD states **why** the product exists, **for whom**, and **what business outcomes** it must support. Implementation status is summarized in [STATUS.md](./STATUS.md); solution behavior is specified in [FSD.md](./FSD.md); engineering design in [TDD.md](./TDD.md).

---

## 2. Business problem

- Candidates and recruiting agencies struggle to **tailor resumes per job** without keyword stuffing, timeline inconsistencies, or weak domain credibility.
- Enterprises and agencies need **governed reusable content** (approved bullets, domains, technologies) rather than unconstrained LLM output.
- Application activity must be **traceable** (which resume, which JD, which portal) for audits, billing, and follow-up.
- Job board and vendor ecosystems require **human-assisted or API-first** flows—not aggressive automation that risks account health or compliance.

---

## 3. Business objectives

| Objective | Description |
|-----------|-------------|
| Revenue readiness | Support **tenant plans** (Agency, Enterprise, Individual) with usage visibility and paths to metered billing. |
| Differentiation | **Verified-database-first** generation: approved components before expensive generative paths. |
| Trust and safety | **Timeline validation**, duplicate/intent checks on new components, and explicit automation boundaries for connectors. |
| Operational scale | **Super Admin**, **Tenant Admin**, **Admin Ops**, and candidate roles with clear permission boundaries. |
| Time-to-offer | Faster **JD-to-tailored resume** cycles with explainability for recruiter and internal review. |

---

## 4. Stakeholders and personas

| Persona | Business need |
|---------|----------------|
| **Super Admin** | Platform-wide tenants, users, billing, governance queues. |
| **Tenant Company Admin** | Company candidates, portal roles, usage, email approvals for outbound comms. |
| **Tenant Candidate / Individual Candidate** | Generate resumes, track jobs/applications, draft outreach, self-billing where applicable. |
| **Admin Ops** | Curate components, domains, technologies, duplicates, timelines, analytics, bulk verified data. |
| **Reviewer / Recruiter** | Review content and/or support candidate workflows (as defined in RBAC matrix). |
| **Hiring / compliance (implicit)** | Evidence of what was sent, which artifact versions, and audit-style events. |

---

## 5. Scope

### 5.1 In scope (product intent)

- Multi-role **portal** with sign-in, RBAC, tenant administration, candidate desk, mail threads (draft/approval states), billing ledger views, repository and jobs, admin ops workspaces, and architecture reference content.
- **Resume intelligence**: JD normalization, role/domain/skill inference, retrieval from approved components, assembly, scoring, explainability, cost-governance estimates.
- **Job connector framework** (registry, safety narrative, refresh cadence) and **candidate application profiles** (titles, locations, keywords, blocklists, reusable answers).
- **Application and applied-role evidence** (status, artifacts metadata, payloads).
- **Exports** (e.g., DOCX) from structured candidate input.
- **Production data contract** (PostgreSQL + pgvector schema) as the target persistence model.

### 5.2 Out of scope (current commercial / legal boundaries)

- Fully automated apply/submit to third-party portals without human confirmation (explicitly discouraged in product positioning).
- Guaranteed interview or offer outcomes.
- Legal determination of work authorization or immigration advice.

---

## 6. Success measures (KPIs / OKR hints)

- **Quality:** Median ATS and realism scores on generated drafts; reduction in timeline violations vs. baseline templates.
- **Efficiency:** Reuse ratio from approved component library; estimated token savings vs. full-generation baseline.
- **Adoption:** Active tenants, monthly generations, applications tracked, email approvals completed.
- **Safety:** Incidents related to connector abuse or credential leakage (target: zero for production design).
- **Commercial:** Tenant spend vs. limits; individual pay-self conversion where offered.

---

## 7. Constraints and assumptions

- Third-party job portals impose **ToS, rate limits, and OAuth/session** constraints; production connectors must respect them.
- **PII and credentials** must not be stored in client-visible demo passwords in production (demo seed accounts are development-only).
- Long-term storage of resumes, JD snapshots, and exports expects **object storage** (e.g., S3/R2), not only relational blobs.
- LLM routing in production may use **multiple models** (cheap rewrite vs. complex generation vs. reviewer); current codebase includes **deterministic** generation and cost estimates without calling external LLM APIs in the core path documented here.

---

## 8. Dependencies

- Hosting (e.g., Vercel for web), managed PostgreSQL with **pgvector**, queue, email provider, payments provider, identity provider—see [TDD.md](./TDD.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 9. Glossary

| Term | Meaning |
|------|---------|
| ATS | Applicant Tracking System; here also used for keyword/fit style scoring. |
| RBAC | Role-based access control (`SUPER_ADMIN`, `TENANT_COMPANY_ADMIN`, etc.). |
| Component | Reusable resume fragment (responsibility, achievement, environment, etc.) with lifecycle status. |
| Connector | Integration concept for a named job portal (Dice, Indeed, etc.). |

---

## 10. Approval and change control

This BRD should be reviewed by product owner, engineering lead, and a stakeholder for compliance or recruiting operations before major scope changes. Updates should bump version and reference commits or PRs where applicable.

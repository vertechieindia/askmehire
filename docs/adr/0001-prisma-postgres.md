# ADR 0001 — PostgreSQL + Prisma as the system of record

- **Status:** Accepted  
- **Date:** 2026-05-12  

## Context

The product required a production-grade persistence layer aligned with `database/schema.sql`, with typed access, migrations, and a path to pgvector-backed similarity search.

## Decision

Adopt **Prisma 5** with PostgreSQL as the authoritative store. Keep the **deterministic resume engine** (`lib/resume-engine.ts`) as pure TypeScript; optionally inject tenant-scoped components from the database when enough published rows exist.

## Consequences

- **Positive:** schema-first migrations, type-safe repositories, clearer service boundaries.
- **Negative:** developers must run Postgres locally (or Docker) and apply migrations before exercising APIs that persist data.
- **Operational:** embeddings and IVFFlat tuning remain follow-up work (see `docs/MIGRATION_PLAN.md`).

# ADR 0003: NextAuth JWT credentials + API RBAC

**Status:** Accepted  
**Date:** May 2026  
**Context:** Phase 1 moved components, jobs, and applications to PostgreSQL. APIs still needed authenticated callers, tenant context, and permission checks aligned with the portal `PERMISSIONS` matrix.

## Decision

- Use **NextAuth v5 (beta)** with **JWT session strategy** and a **Credentials** provider.
- Store users in the existing `users` table with **Argon2id** `password_hash`, optional **`portal_key`** (stable string matching `PORTAL_USERS[].id` for UI lookup), and session claims for **`role`**, **`tenant_id`**, and **`portal_key`**.
- Enforce **middleware** JWT presence on `/api/*` except `/api/auth/*` and `/api/health` (with optional **`AUTH_DEV_BYPASS`** in development/test).
- Resolve **`ApiContext`** in `prepareApiContext`: `auth()` (or dev-bypass acting user), optional **`x-impersonate-user-id`** for `impersonation:read`, then **`requirePermission`** per route.

## Consequences

- **Positive:** No Prisma adapter session tables; fewer moving parts; RBAC enforced server-side; audit hooks on login and impersonation.
- **Negative:** Credentials provider is maintenance-heavy vs. managed IdP; production must set **`AUTH_SECRET`** (≥32 chars) and operational cookie/CSRF practices.
- **Follow-up:** Optional migration to Clerk/Auth0 while keeping the same `ApiContext` shape.

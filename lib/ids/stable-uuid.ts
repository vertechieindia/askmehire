import { v5 as uuidv5, validate as uuidValidate } from "uuid";

/** DNS namespace UUID — stable namespace for deterministic askmehire IDs */
const NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export function stableUuid(...parts: string[]): string {
  return uuidv5(parts.join("|"), NAMESPACE);
}

export function resolveOrStableUuid(legacyOrUuid: string, kind: string, legacyKey: string): string {
  if (uuidValidate(legacyOrUuid)) {
    return legacyOrUuid;
  }
  return stableUuid("askmehire", kind, legacyKey);
}

export const SEED_IDS = {
  tenant: stableUuid("askmehire", "tenant", "bootstrap"),
  /** Second demo tenant (Northstar Recruiting) */
  tenantNorthstar: stableUuid("askmehire", "tenant", "northstar"),
  adminUser: stableUuid("askmehire", "user", "bootstrap-admin"),
  demoUser: stableUuid("askmehire", "user", "user-demo"),
  job: (legacyId: string) => stableUuid("askmehire", "job", legacyId),
  resume: (legacyId: string) => stableUuid("askmehire", "resume", legacyId),
  role: (name: string) => stableUuid("askmehire", "role", name),
  domain: (name: string) => stableUuid("askmehire", "domain", name),
  technology: (name: string) => stableUuid("askmehire", "technology", name),
  component: (legacyId: string) => stableUuid("askmehire", "component", legacyId),
  application: (legacyId: string) => stableUuid("askmehire", "application", legacyId)
} as const;

/** Deterministic UUID for a portal UI user id (e.g. `user-super`). */
export function portalUserUuid(portalKey: string): string {
  return stableUuid("askmehire", "portal-user", portalKey);
}

import type { PortalRole } from "@/lib/portal";
import { PERMISSIONS } from "@/lib/portal";
import { ForbiddenError } from "@/lib/http/api-errors";

export function roleHasPermission(role: PortalRole | string, permission: string): boolean {
  const list = PERMISSIONS[role as PortalRole];
  if (!list) {
    return false;
  }
  return list.includes("platform:full") || list.includes(permission);
}

export function requirePermission(role: PortalRole | string, permission: string): void {
  if (!roleHasPermission(role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

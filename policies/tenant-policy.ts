import { ForbiddenError } from "@/lib/http/api-errors";

export function assertTenantResource(tenantId: string, resourceTenantId: string | null | undefined): void {
  if (!resourceTenantId) {
    return;
  }
  if (resourceTenantId !== tenantId) {
    throw new ForbiddenError("Resource belongs to a different tenant.");
  }
}

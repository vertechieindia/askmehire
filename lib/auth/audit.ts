import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type AuditInput = {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
};

export async function writeAuditEvent(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        actorId: input.actorId ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: (input.payload ?? {}) as object,
        severity: input.severity ?? "info"
      }
    });
  } catch {
    /* never block primary request on audit failure */
  }
}

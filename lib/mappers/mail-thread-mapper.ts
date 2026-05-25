import type { MailThread as PrismaMailThread } from "@prisma/client";
import type { MailThread } from "@/lib/portal";

export function mapPrismaMailThreadToPortal(row: PrismaMailThread, approvedByEmail?: string | null): MailThread {
  return {
    id: row.id,
    tenantId: row.tenantId ?? undefined,
    userId: row.userId,
    jobId: row.jobId ?? "",
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    company: row.company ?? "",
    subject: row.subject,
    direction: row.direction as MailThread["direction"],
    status: row.status as MailThread["status"],
    lastMessage: row.lastMessage ?? "",
    draft: row.draft ?? "",
    approvedBy: approvedByEmail ?? undefined,
    updatedAt: row.updatedAt.toISOString().slice(0, 10)
  };
}

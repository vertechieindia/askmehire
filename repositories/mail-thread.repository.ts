import { randomUUID } from "node:crypto";
import type { MailThread as PortalMailThread } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { mapPrismaMailThreadToPortal } from "@/lib/mappers/mail-thread-mapper";

export class MailThreadRepository {
  async listForUser(userId: string, tenantId: string | null, opts?: { statuses?: string[] }) {
    const rows = await prisma.mailThread.findMany({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
        ...(opts?.statuses?.length ? { status: { in: opts.statuses } } : {})
      },
      orderBy: { updatedAt: "desc" }
    });
    return rows;
  }

  async listForTenantApproval(tenantId: string) {
    return prisma.mailThread.findMany({
      where: {
        tenantId,
        status: { in: ["approval_requested", "approved"] }
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  async findById(id: string) {
    return prisma.mailThread.findUnique({ where: { id } });
  }

  async createFromPortal(
    tenantId: string | null,
    userId: string,
    thread: Omit<PortalMailThread, "id" | "updatedAt">
  ) {
    const row = await prisma.mailThread.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        jobId: thread.jobId && thread.jobId.length >= 32 ? thread.jobId : null,
        contactName: thread.contactName,
        contactEmail: thread.contactEmail,
        company: thread.company || null,
        subject: thread.subject,
        direction: thread.direction,
        status: thread.status,
        lastMessage: thread.lastMessage,
        draft: thread.draft,
        providerThreadId: null,
        providerMessageId: null
      }
    });
    return row;
  }

  async updateStatus(
    id: string,
    patch: {
      status: string;
      approvedById?: string | null;
      lastMessage?: string;
      providerMessageId?: string;
      providerThreadId?: string;
      provider?: string;
    }
  ) {
    return prisma.mailThread.update({
      where: { id },
      data: patch
    });
  }

  async updateDraft(id: string, draft: string, opts?: { status?: string }) {
    return prisma.mailThread.update({
      where: { id },
      data: {
        draft,
        ...(opts?.status ? { status: opts.status } : {})
      }
    });
  }

  async upsertIncomingFromProvider(params: {
    provider: "gmail" | "outlook";
    tenantId: string | null;
    userId: string;
    contactEmail: string;
    contactName: string;
    company?: string;
    subject: string;
    lastMessage: string;
    providerThreadId: string;
    providerMessageId: string;
    jobId?: string | null;
  }) {
    const existing = await prisma.mailThread.findFirst({
      where: {
        userId: params.userId,
        providerThreadId: params.providerThreadId
      }
    });
    if (existing) {
      return prisma.mailThread.update({
        where: { id: existing.id },
        data: {
          lastMessage: params.lastMessage,
          providerMessageId: params.providerMessageId,
          provider: params.provider,
          status: existing.status === "sent" ? "incoming" : existing.status,
          direction: "incoming"
        }
      });
    }
    return prisma.mailThread.create({
      data: {
        id: randomUUID(),
        tenantId: params.tenantId,
        userId: params.userId,
        jobId: params.jobId ?? null,
        contactName: params.contactName,
        contactEmail: params.contactEmail,
        company: params.company ?? null,
        subject: params.subject,
        direction: "incoming",
        status: "incoming",
        lastMessage: params.lastMessage,
        draft: "",
        providerThreadId: params.providerThreadId,
        providerMessageId: params.providerMessageId,
        provider: params.provider
      }
    });
  }

  async mapRowsToPortal(rows: Awaited<ReturnType<typeof this.listForUser>>) {
    const approverIds = [...new Set(rows.map((r) => r.approvedById).filter(Boolean))] as string[];
    const approvers =
      approverIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: approverIds } },
            select: { id: true, email: true }
          })
        : [];
    const emailById = new Map(approvers.map((u) => [u.id, u.email]));
    return rows.map((row) => mapPrismaMailThreadToPortal(row, row.approvedById ? emailById.get(row.approvedById) : null));
  }
}

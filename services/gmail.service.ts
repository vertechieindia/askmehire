import { AppError } from "@/lib/http/api-errors";
import { getGmailOAuthConfig } from "@/lib/integrations/gmail/config";
import {
  exchangeGmailCode,
  getGmailAuthorizeUrl,
  gmailClientFromRefreshToken,
  listRecentMessages,
  sendGmailMessage
} from "@/lib/integrations/gmail/client";
import { createGmailOAuthState } from "@/lib/integrations/gmail/oauth-state";
import type { ApiContext } from "@/lib/http/with-api-handler";
import { roleHasPermission } from "@/lib/auth/rbac";
import { GmailConnectionRepository } from "@/repositories/gmail-connection.repository";
import { MailThreadRepository } from "@/repositories/mail-thread.repository";
import type { MailThread } from "@/lib/portal";
import { SEED_IDS } from "@/lib/ids/stable-uuid";

function parseEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

export class GmailService {
  constructor(
    private readonly connections = new GmailConnectionRepository(),
    private readonly mailThreads = new MailThreadRepository()
  ) {}

  assertConfigured() {
    if (!getGmailOAuthConfig()) {
      throw new AppError("GMAIL_NOT_CONFIGURED", "Gmail OAuth is not configured on the server.", 503);
    }
  }

  getConnectUrl(ctx: ApiContext): string {
    this.assertConfigured();
    const state = createGmailOAuthState(ctx.userId, ctx.tenantId);
    return getGmailAuthorizeUrl(state);
  }

  async handleCallback(code: string, state: string, expectedUserId: string) {
    this.assertConfigured();
    const { verifyGmailOAuthState } = await import("@/lib/integrations/gmail/oauth-state");
    const payload = verifyGmailOAuthState(state);
    if (payload.userId !== expectedUserId) {
      throw new AppError("OAUTH_STATE_MISMATCH", "OAuth state does not match the signed-in user.", 400);
    }
    const tokens = await exchangeGmailCode(code);
    await this.connections.upsert({
      userId: payload.userId,
      tenantId: payload.tenantId,
      gmailAddress: tokens.gmailAddress,
      refreshToken: tokens.refreshToken
    });
    return { gmailAddress: tokens.gmailAddress };
  }

  async getStatus(userId: string) {
    const row = await this.connections.findByUserId(userId);
    if (!row) {
      return { connected: false as const };
    }
    return {
      connected: true as const,
      gmailAddress: row.gmailAddress,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null
    };
  }

  async disconnect(userId: string) {
    await this.connections.deleteByUserId(userId);
    return { disconnected: true };
  }

  async isConnected(userId: string) {
    return Boolean(await this.connections.findByUserId(userId));
  }

  async listThreads(ctx: ApiContext): Promise<MailThread[]> {
    let rows;
    if (roleHasPermission(ctx.role, "tenant:manage_users")) {
      rows = await this.mailThreads.listForTenantApproval(ctx.tenantId);
    } else if (roleHasPermission(ctx.role, "email:approve")) {
      rows = await this.mailThreads.listForUser(ctx.userId, ctx.tenantId);
    } else {
      rows = await this.mailThreads.listForUser(ctx.userId, ctx.tenantId);
    }
    return this.mailThreads.mapRowsToPortal(rows);
  }

  async createDraft(
    ctx: ApiContext,
    body: {
      jobId?: string;
      contactName: string;
      contactEmail: string;
      company?: string;
      subject: string;
      draft: string;
    }
  ) {
    const jobId = body.jobId ? SEED_IDS.job(body.jobId) : null;
    const row = await this.mailThreads.createFromPortal(ctx.tenantId, ctx.userId, {
      userId: ctx.userId,
      tenantId: ctx.tenantId ?? undefined,
      jobId: jobId ?? "",
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      company: body.company ?? "",
      subject: body.subject,
      direction: "outbound",
      status: "draft",
      lastMessage: "Draft created in askmehire.",
      draft: body.draft
    });
    const [mapped] = await this.mailThreads.mapRowsToPortal([row]);
    return mapped;
  }

  async updateThreadStatus(ctx: ApiContext, threadId: string, status: MailThread["status"]) {
    const row = await this.mailThreads.findById(threadId);
    if (!row) {
      throw new AppError("NOT_FOUND", "Mail thread not found.", 404);
    }
    if (row.userId !== ctx.userId && !roleHasPermission(ctx.role, "email:approve") && !roleHasPermission(ctx.role, "tenant:manage_users")) {
      throw new AppError("FORBIDDEN", "You cannot update this mail thread.", 403);
    }
    let approvedById: string | null | undefined;
    if (status === "approved" && roleHasPermission(ctx.role, "email:approve")) {
      approvedById = ctx.actorUserId;
    }
    const updated = await this.mailThreads.updateStatus(threadId, {
      status,
      ...(approvedById !== undefined ? { approvedById } : {}),
      ...(status === "sent" ? { lastMessage: "Email sent through Gmail." } : {})
    });
    const [mapped] = await this.mailThreads.mapRowsToPortal([updated]);
    return mapped;
  }

  async syncInbox(ctx: ApiContext) {
    const connection = await this.connections.findByUserId(ctx.userId);
    if (!connection) {
      return { imported: 0, contactCount: 0, skipped: true as const };
    }
    const gmail = gmailClientFromRefreshToken(connection.refreshTokenEncrypted);
    const threads = await this.mailThreads.listForUser(ctx.userId, ctx.tenantId);
    const contactEmails = [...new Set(threads.map((t) => t.contactEmail.toLowerCase()).filter(Boolean))];
    let imported = 0;

    for (const email of contactEmails.slice(0, 25)) {
      const messages = await listRecentMessages(gmail, `newer_than:14d (from:${email} OR to:${email})`, 8);
      for (const msg of messages) {
        const related = threads.find((t) => t.contactEmail.toLowerCase() === email);
        await this.mailThreads.upsertIncomingFromProvider({
          provider: "gmail",
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          contactEmail: email,
          contactName: related?.contactName ?? email,
          company: related?.company ?? undefined,
          subject: msg.subject,
          lastMessage: msg.snippet || msg.bodyText.slice(0, 500),
          providerThreadId: msg.threadId,
          providerMessageId: msg.id,
          jobId: related?.jobId ?? null
        });
        imported += 1;
      }
    }

    for (const thread of threads.filter((t) => t.providerThreadId && (t.provider === "gmail" || !t.provider))) {
      const messages = await listRecentMessages(gmail, `thread:${thread.providerThreadId}`, 5);
      for (const msg of messages) {
        await this.mailThreads.upsertIncomingFromProvider({
          provider: "gmail",
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          contactEmail: thread.contactEmail,
          contactName: thread.contactName,
          company: thread.company ?? undefined,
          subject: msg.subject,
          lastMessage: msg.snippet || msg.bodyText.slice(0, 500),
          providerThreadId: msg.threadId,
          providerMessageId: msg.id,
          jobId: thread.jobId
        });
        imported += 1;
      }
    }

    await this.connections.touchSync(ctx.userId);
    return { imported, contactCount: contactEmails.length, skipped: false as const };
  }

  async sendThread(ctx: ApiContext, threadId: string) {
    const connection = await this.connections.findByUserId(ctx.userId);
    if (!connection) {
      throw new AppError("GMAIL_NOT_CONNECTED", "Connect Gmail before sending.", 400);
    }
    const row = await this.mailThreads.findById(threadId);
    if (!row || row.userId !== ctx.userId) {
      throw new AppError("NOT_FOUND", "Mail thread not found.", 404);
    }
    const canSendFromDraft = ctx.role === "INDIVIDUAL_CANDIDATE";
    if (!canSendFromDraft && row.status !== "approved") {
      throw new AppError("INVALID_STATE", "Thread must be approved before sending.", 400);
    }
    if (canSendFromDraft && row.status !== "approved" && row.status !== "draft") {
      throw new AppError("INVALID_STATE", "Thread must be draft or approved before sending.", 400);
    }
    const body = row.draft?.trim() || row.lastMessage || "";
    if (!body) {
      throw new AppError("VALIDATION_ERROR", "Draft body is empty.", 400);
    }
    const gmail = gmailClientFromRefreshToken(connection.refreshTokenEncrypted);
    const sent = await sendGmailMessage(gmail, {
      to: row.contactEmail,
      subject: row.subject,
      body,
      threadId: row.providerThreadId ?? undefined
    });
    const updated = await this.mailThreads.updateStatus(threadId, {
      status: "sent",
      lastMessage: "Email sent through Gmail.",
      providerMessageId: sent.id,
      providerThreadId: sent.threadId,
      provider: "gmail"
    });
    const [mapped] = await this.mailThreads.mapRowsToPortal([updated]);
    return mapped;
  }
}

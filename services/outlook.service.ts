import { AppError } from "@/lib/http/api-errors";
import { getOutlookOAuthConfig } from "@/lib/integrations/outlook/config";
import {
  exchangeOutlookCode,
  getOutlookAccessToken,
  getOutlookAuthorizeUrl,
  listConversationMessages,
  listRecentMessages,
  sendOutlookMessage
} from "@/lib/integrations/outlook/client";
import { createOutlookOAuthState } from "@/lib/integrations/outlook/oauth-state";
import type { ApiContext } from "@/lib/http/with-api-handler";
import { OutlookConnectionRepository } from "@/repositories/outlook-connection.repository";
import { MailThreadRepository } from "@/repositories/mail-thread.repository";

export class OutlookService {
  constructor(
    private readonly connections = new OutlookConnectionRepository(),
    private readonly mailThreads = new MailThreadRepository()
  ) {}

  assertConfigured() {
    if (!getOutlookOAuthConfig()) {
      throw new AppError("OUTLOOK_NOT_CONFIGURED", "Outlook OAuth is not configured on the server.", 503);
    }
  }

  getConnectUrl(ctx: ApiContext): string {
    this.assertConfigured();
    const state = createOutlookOAuthState(ctx.userId, ctx.tenantId);
    return getOutlookAuthorizeUrl(state);
  }

  async handleCallback(code: string, state: string, expectedUserId: string) {
    this.assertConfigured();
    const { verifyOutlookOAuthState } = await import("@/lib/integrations/outlook/oauth-state");
    const payload = verifyOutlookOAuthState(state);
    if (payload.userId !== expectedUserId) {
      throw new AppError("OAUTH_STATE_MISMATCH", "OAuth state does not match the signed-in user.", 400);
    }
    const tokens = await exchangeOutlookCode(code);
    await this.connections.upsert({
      userId: payload.userId,
      tenantId: payload.tenantId,
      outlookAddress: tokens.outlookAddress,
      refreshToken: tokens.refreshToken
    });
    return { outlookAddress: tokens.outlookAddress };
  }

  async getStatus(userId: string) {
    const config = getOutlookOAuthConfig();
    const configured = Boolean(config);
    const row = await this.connections.findByUserId(userId);
    if (!row) {
      return {
        connected: false as const,
        configured,
        redirectUri: config?.redirectUri ?? null
      };
    }
    return {
      connected: true as const,
      configured,
      redirectUri: config?.redirectUri ?? null,
      outlookAddress: row.outlookAddress,
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

  async syncInbox(ctx: ApiContext) {
    const connection = await this.connections.findByUserId(ctx.userId);
    if (!connection) {
      return { imported: 0, contactCount: 0, skipped: true as const };
    }
    const accessToken = await getOutlookAccessToken(connection.refreshTokenEncrypted);
    const threads = await this.mailThreads.listForUser(ctx.userId, ctx.tenantId);
    const contactEmails = [...new Set(threads.map((t) => t.contactEmail.toLowerCase()).filter(Boolean))];
    let imported = 0;

    for (const email of contactEmails.slice(0, 25)) {
      const messages = await listRecentMessages(accessToken, email, 8);
      for (const msg of messages) {
        const related = threads.find((t) => t.contactEmail.toLowerCase() === email);
        await this.mailThreads.upsertIncomingFromProvider({
          provider: "outlook",
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

    for (const thread of threads.filter((t) => t.providerThreadId && (t.provider === "outlook" || !t.provider))) {
      const messages = await listConversationMessages(accessToken, thread.providerThreadId!, 5);
      for (const msg of messages) {
        await this.mailThreads.upsertIncomingFromProvider({
          provider: "outlook",
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
      throw new AppError("OUTLOOK_NOT_CONNECTED", "Connect Outlook before sending.", 400);
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
    const accessToken = await getOutlookAccessToken(connection.refreshTokenEncrypted);
    const sent = await sendOutlookMessage(accessToken, {
      to: row.contactEmail,
      subject: row.subject,
      body,
      conversationId: row.providerThreadId ?? undefined
    });
    const updated = await this.mailThreads.updateStatus(threadId, {
      status: "sent",
      lastMessage: "Email sent through Outlook.",
      providerMessageId: sent.id || row.providerMessageId || undefined,
      providerThreadId: sent.threadId || row.providerThreadId || undefined,
      provider: "outlook"
    });
    const [mapped] = await this.mailThreads.mapRowsToPortal([updated]);
    return mapped;
  }
}

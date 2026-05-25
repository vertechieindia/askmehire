import { AppError } from "@/lib/http/api-errors";
import type { ApiContext } from "@/lib/http/with-api-handler";
import { GmailService } from "@/services/gmail.service";
import { OutlookService } from "@/services/outlook.service";
import { MailThreadRepository } from "@/repositories/mail-thread.repository";

export class MailService {
  constructor(
    private readonly gmail = new GmailService(),
    private readonly outlook = new OutlookService(),
    private readonly mailThreads = new MailThreadRepository()
  ) {}

  async syncInbox(ctx: ApiContext) {
    const gmailResult = await this.gmail.syncInbox(ctx);
    const outlookResult = await this.outlook.syncInbox(ctx);

    if (gmailResult.skipped && outlookResult.skipped) {
      throw new AppError("MAIL_NOT_CONNECTED", "Connect Gmail or Outlook before syncing.", 400);
    }

    const gmailImported = gmailResult.skipped ? 0 : gmailResult.imported;
    const outlookImported = outlookResult.skipped ? 0 : outlookResult.imported;

    return {
      imported: gmailImported + outlookImported,
      contactCount: Math.max(gmailResult.contactCount, outlookResult.contactCount),
      gmailImported,
      outlookImported
    };
  }

  async sendThread(ctx: ApiContext, threadId: string) {
    const row = await this.mailThreads.findById(threadId);
    if (!row || row.userId !== ctx.userId) {
      throw new AppError("NOT_FOUND", "Mail thread not found.", 404);
    }

    const [gmailConnected, outlookConnected] = await Promise.all([
      this.gmail.isConnected(ctx.userId),
      this.outlook.isConnected(ctx.userId)
    ]);

    if (!gmailConnected && !outlookConnected) {
      throw new AppError("MAIL_NOT_CONNECTED", "Connect Gmail or Outlook before sending.", 400);
    }

    if (row.provider === "outlook") {
      return this.outlook.sendThread(ctx, threadId);
    }
    if (row.provider === "gmail") {
      return this.gmail.sendThread(ctx, threadId);
    }
    if (outlookConnected && !gmailConnected) {
      return this.outlook.sendThread(ctx, threadId);
    }
    return this.gmail.sendThread(ctx, threadId);
  }
}

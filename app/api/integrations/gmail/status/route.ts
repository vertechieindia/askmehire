import { handleJsonApi } from "@/lib/http/with-api-handler";
import { GmailService } from "@/services/gmail.service";

const gmailService = new GmailService();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => gmailService.getStatus(ctx.userId),
    { rateLimitKey: "api:gmail:status" }
  );
}

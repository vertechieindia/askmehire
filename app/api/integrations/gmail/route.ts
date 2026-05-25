import { handleJsonApi } from "@/lib/http/with-api-handler";
import { GmailService } from "@/services/gmail.service";

const gmailService = new GmailService();

export async function DELETE(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => gmailService.disconnect(ctx.userId),
    { rateLimitKey: "api:gmail:disconnect" }
  );
}

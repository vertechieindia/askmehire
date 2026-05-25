import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { requirePermission } from "@/lib/auth/rbac";
import { mailSendSchema } from "@/validators/api-schemas";
import { MailService } from "@/services/mail.service";

const mailService = new MailService();

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "email:draft");
      const body = await parseJsonBody(req, mailSendSchema);
      return mailService.sendThread(ctx, body.threadId);
    },
    { rateLimitKey: "api:mail:send" }
  );
}

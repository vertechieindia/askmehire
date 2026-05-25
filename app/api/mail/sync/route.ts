import { handleJsonApi } from "@/lib/http/with-api-handler";
import { requirePermission } from "@/lib/auth/rbac";
import { MailService } from "@/services/mail.service";

const mailService = new MailService();

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => {
      requirePermission(ctx.role, "email:draft");
      return mailService.syncInbox(ctx);
    },
    { rateLimitKey: "api:mail:sync" }
  );
}

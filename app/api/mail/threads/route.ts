import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { requirePermission } from "@/lib/auth/rbac";
import { mailThreadCreateSchema, mailThreadPatchSchema } from "@/validators/api-schemas";
import { GmailService } from "@/services/gmail.service";

const gmailService = new GmailService();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => {
      requirePermission(ctx.role, "email:draft");
      return gmailService.listThreads(ctx);
    },
    { rateLimitKey: "api:mail:threads:get" }
  );
}

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "email:draft");
      const body = await parseJsonBody(req, mailThreadCreateSchema);
      return gmailService.createDraft(ctx, body);
    },
    { rateLimitKey: "api:mail:threads:post" }
  );
}

export async function PATCH(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      const body = await parseJsonBody(req, mailThreadPatchSchema);
      if (body.draft !== undefined) {
        requirePermission(ctx.role, "email:draft");
      }
      if (body.status === "approval_requested") {
        requirePermission(ctx.role, "email:draft");
      }
      if (body.status === "approved") {
        requirePermission(ctx.role, "email:approve");
      }
      return gmailService.patchThread(ctx, body.threadId, {
        status: body.status,
        draft: body.draft
      });
    },
    { rateLimitKey: "api:mail:threads:patch" }
  );
}

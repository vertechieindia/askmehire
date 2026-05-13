import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { applicationCreateSchema } from "@/validators/api-schemas";
import { ApplicationsService } from "@/services/applications.service";
import { requirePermission } from "@/lib/auth/rbac";

const applicationsService = new ApplicationsService();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => {
      requirePermission(ctx.role, "candidate:track_jobs");
      return applicationsService.list(ctx);
    },
    {
      rateLimitKey: "api:applications:get"
    }
  );
}

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "candidate:track_jobs");
      const body = await parseJsonBody(req, applicationCreateSchema);
      return applicationsService.create(body, ctx);
    },
    { rateLimitKey: "api:applications:post" }
  );
}

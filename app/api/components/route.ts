import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { componentCreateSchema } from "@/validators/api-schemas";
import { ComponentsService } from "@/services/components.service";
import { roleHasPermission, requirePermission } from "@/lib/auth/rbac";
import { ForbiddenError } from "@/lib/http/api-errors";

const componentsService = new ComponentsService();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => {
      const allowed =
        roleHasPermission(ctx.role, "analytics:view") ||
        roleHasPermission(ctx.role, "components:create") ||
        roleHasPermission(ctx.role, "components:approve");
      if (!allowed) {
        throw new ForbiddenError("Missing permission to list components.");
      }
      return componentsService.list(ctx);
    },
    { rateLimitKey: "api:components:get" }
  );
}

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "components:create");
      const body = await parseJsonBody(req, componentCreateSchema);
      return componentsService.create(body, ctx);
    },
    { rateLimitKey: "api:components:post" }
  );
}

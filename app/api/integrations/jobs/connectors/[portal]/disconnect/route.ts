import { handleJsonApi } from "@/lib/http/with-api-handler";
import { JobConnectorService } from "@/services/job-connector.service";
import { requirePermission } from "@/lib/auth/rbac";
import { resolveExternalConnectorPlatform } from "@/lib/integrations/jobs/types";
import { AppError } from "@/lib/http/api-errors";

const jobConnectorService = new JobConnectorService();

type RouteContext = { params: Promise<{ portal: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleJsonApi(
    request,
    async (_req, ctx) => {
      requirePermission(ctx.role, "connector:manage");
      const { portal: portalParam } = await context.params;
      const portal = resolveExternalConnectorPlatform(portalParam);
      if (!portal) {
        throw new AppError("INVALID_CONNECTOR", `Unsupported connector: ${portalParam}`, 400);
      }
      return jobConnectorService.disconnect(ctx, portal);
    },
    { rateLimitKey: "api:integrations:jobs:disconnect" }
  );
}

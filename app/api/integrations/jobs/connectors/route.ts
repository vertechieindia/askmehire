import { handleJsonApi } from "@/lib/http/with-api-handler";
import { JobConnectorService } from "@/services/job-connector.service";
import { requirePermission } from "@/lib/auth/rbac";

const jobConnectorService = new JobConnectorService();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => {
      requirePermission(ctx.role, "candidate:track_jobs");
      return jobConnectorService.listStatuses(ctx);
    },
    { rateLimitKey: "api:integrations:jobs:connectors" }
  );
}

import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { JobConnectorService } from "@/services/job-connector.service";
import { requirePermission } from "@/lib/auth/rbac";
import { connectorSyncSchema } from "@/validators/api-schemas";

const jobConnectorService = new JobConnectorService();

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "candidate:track_jobs");
      const body = await parseJsonBody(req, connectorSyncSchema);
      return jobConnectorService.sync(ctx, body);
    },
    { rateLimitKey: "api:integrations:jobs:sync" }
  );
}

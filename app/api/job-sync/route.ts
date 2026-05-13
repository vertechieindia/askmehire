import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { jobSyncRequestSchema } from "@/validators/api-schemas";
import { JobSyncService } from "@/services/job-sync.service";
import { requirePermission } from "@/lib/auth/rbac";

const jobSyncService = new JobSyncService();

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "candidate:track_jobs");
      const body = await parseJsonBody(req, jobSyncRequestSchema);
      return jobSyncService.sync(body, ctx);
    },
    { rateLimitKey: "api:job-sync" }
  );
}

import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { JobRepository } from "@/repositories/job.repository";
import { JobsService } from "@/services/jobs.service";
import { requirePermission } from "@/lib/auth/rbac";
import { jobCreateSchema } from "@/validators/api-schemas";

const jobRepository = new JobRepository();
const jobsService = new JobsService();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "candidate:track_jobs");
      const { searchParams } = new URL(req.url);
      const q = searchParams.get("q") ?? "";
      const domain = searchParams.get("domain") ?? "";
      const connectedSources = await jobRepository.listConnectedConnectorSources(ctx.tenantId);
      const visibleSources = jobRepository.buildVisibleSources(connectedSources);
      const grouped = await jobRepository.searchGrouped(ctx.tenantId, q, domain);
      return {
        query: q,
        total: grouped.total,
        jobs: grouped.jobs,
        bySource: grouped.bySource,
        connectedPortals: connectedSources,
        sourceCoverage: visibleSources,
        antiSpamPolicy: {
          mode: "human_assisted",
          rateLimit: "20 prepared applications per user per day",
          automationBoundary: "Connector workflows prepare and track applications but do not spam-submit."
        }
      };
    },
    { rateLimitKey: "api:jobs" }
  );
}

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "jobs:create_internal");
      const body = await parseJsonBody(req, jobCreateSchema);
      return jobsService.createInternal(body, ctx);
    },
    { rateLimitKey: "api:jobs:post" }
  );
}

import { handleJsonApi } from "@/lib/http/with-api-handler";
import { JobRepository } from "@/repositories/job.repository";
import { requirePermission } from "@/lib/auth/rbac";

const jobRepository = new JobRepository();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "candidate:track_jobs");
      const { searchParams } = new URL(req.url);
      const q = searchParams.get("q") ?? "";
      const domain = searchParams.get("domain") ?? "";
      const jobs = await jobRepository.search(ctx.tenantId, q, domain);
      return {
        jobs,
        sourceCoverage: ["LinkedIn", "Dice", "Monster", "ZipRecruiter", "Glassdoor", "Prime Vendor"],
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

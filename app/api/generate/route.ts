import { handleJsonApi, parseJsonBody } from "@/lib/http/with-api-handler";
import { resumeGenerationRequestSchema } from "@/validators/api-schemas";
import { ResumeGenerationService } from "@/services/resume-generation.service";
import { requirePermission } from "@/lib/auth/rbac";

const resumeGenerationService = new ResumeGenerationService();

export async function POST(request: Request) {
  return handleJsonApi(
    request,
    async (req, ctx) => {
      requirePermission(ctx.role, "candidate:generate_resume");
      const body = await parseJsonBody(req, resumeGenerationRequestSchema);
      return resumeGenerationService.generate(body, ctx);
    },
    { rateLimitKey: "api:generate" }
  );
}

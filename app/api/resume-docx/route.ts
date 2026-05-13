import { NextResponse } from "next/server";
import { enforceRateLimit, parseJsonBody, prepareApiContext, toApiErrorResponse } from "@/lib/http/with-api-handler";
import { createLogger } from "@/lib/log/logger";
import { randomUUID } from "node:crypto";
import { resumeDocxRequestSchema } from "@/validators/api-schemas";
import { ResumeDocxService } from "@/services/resume-docx.service";
import { requirePermission } from "@/lib/auth/rbac";

const resumeDocxService = new ResumeDocxService();

export async function POST(request: Request) {
  let ctx: Awaited<ReturnType<typeof prepareApiContext>> | null = null;
  try {
    ctx = await prepareApiContext(request);
    requirePermission(ctx.role, "candidate:generate_resume");
    await enforceRateLimit(ctx, request, "api:resume-docx");
    const body = await parseJsonBody(request, resumeDocxRequestSchema);
    const buffer = await resumeDocxService.renderToBuffer(body.input);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${body.input.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "resume"}-resume.docx"`,
        "x-request-id": ctx.requestId,
        "x-tenant-id": ctx.tenantId
      }
    });
  } catch (error) {
    const requestId = ctx?.requestId ?? request.headers.get("x-request-id")?.trim() ?? randomUUID();
    const logger = ctx?.logger ?? createLogger({ requestId });
    return toApiErrorResponse(error, requestId, logger);
  }
}

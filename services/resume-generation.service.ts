import { generateResume } from "@/lib/resume-engine";
import type { ResumeGenerationRequest, ResumeGenerationResult } from "@/lib/types";
import { ComponentRepository } from "@/repositories/component.repository";
import { emitDomainEvent } from "@/events/domain-events";
import type { ApiContext } from "@/lib/http/with-api-handler";

const MIN_DB_COMPONENTS = 4;

export class ResumeGenerationService {
  constructor(private readonly components = new ComponentRepository()) {}

  async generate(request: ResumeGenerationRequest, ctx: ApiContext): Promise<ResumeGenerationResult> {
    const fromDb = await this.components.listPublishedForTenant(ctx.tenantId);
    const options =
      fromDb.length >= MIN_DB_COMPONENTS ? { intelligenceComponents: fromDb } : undefined;
    const result = generateResume(request, options);
    await emitDomainEvent({
      type: "resume.generated",
      tenantId: ctx.tenantId,
      requestId: ctx.requestId,
      payload: { resumeId: result.id, role: result.role, domain: result.domain }
    });
    return result;
  }
}

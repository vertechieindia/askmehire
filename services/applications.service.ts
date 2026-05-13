import { ApplicationRepository } from "@/repositories/application.repository";
import type { ApiContext } from "@/lib/http/with-api-handler";
import { roleHasPermission } from "@/lib/auth/rbac";
import { emitDomainEvent } from "@/events/domain-events";
import type { ApplicationRecord } from "@/lib/types";

export class ApplicationsService {
  constructor(private readonly repo = new ApplicationRepository()) {}

  async list(ctx: ApiContext): Promise<ApplicationRecord[]> {
    const allInTenant =
      roleHasPermission(ctx.role, "platform:full") || roleHasPermission(ctx.role, "tenant:manage_users");
    return this.repo.list(ctx.tenantId, allInTenant ? undefined : { userId: ctx.userId });
  }

  async create(
    body: {
      jobId: string;
      resumeId: string;
      status?: ApplicationRecord["status"];
      atsScore?: number;
      realismScore?: number;
      artifacts?: ApplicationRecord["artifacts"];
    },
    ctx: ApiContext
  ): Promise<ApplicationRecord> {
    const record = await this.repo.create(ctx.tenantId, { ...body, userId: ctx.userId });
    await emitDomainEvent({
      type: "application.created",
      tenantId: ctx.tenantId,
      requestId: ctx.requestId,
      payload: { applicationId: record.id }
    });
    return record;
  }
}

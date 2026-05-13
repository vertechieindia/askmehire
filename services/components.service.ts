import { reviewComponentDraft } from "@/lib/resume-engine";
import { ComponentRepository } from "@/repositories/component.repository";
import type { ApiContext } from "@/lib/http/with-api-handler";
import { emitDomainEvent } from "@/events/domain-events";

type ComponentCreateBody = {
  role: string;
  technology: string;
  domain: string;
  timelineStart: number;
  timelineEnd: number;
  intent: string;
  baseLogic: string;
  componentType?: string;
  variations?: string[];
  qualityScore?: number;
  freshnessScore?: number;
  deprecationScore?: number;
  tags?: string[];
};

export class ComponentsService {
  constructor(private readonly repo = new ComponentRepository()) {}

  async list(ctx: ApiContext) {
    const components = await this.repo.listAllForTenant(ctx.tenantId);
    const totals = await this.repo.countByStatus(ctx.tenantId);
    return { components, totals };
  }

  async create(body: ComponentCreateBody, ctx: ApiContext) {
    const catalog = await this.repo.listAllForTenant(ctx.tenantId);
    const review = reviewComponentDraft(
      {
        role: body.role,
        technology: body.technology,
        domain: body.domain,
        timelineStart: body.timelineStart,
        timelineEnd: body.timelineEnd,
        intent: body.intent,
        baseLogic: body.baseLogic
      },
      { comparisonCatalog: catalog }
    );

    const component = await this.repo.createDraft(ctx.tenantId, {
      role: body.role,
      technology: body.technology,
      domain: body.domain,
      timelineStart: body.timelineStart,
      timelineEnd: body.timelineEnd,
      componentType: body.componentType || "responsibility",
      intent: body.intent,
      baseLogic: body.baseLogic,
      variations: body.variations?.length ? body.variations : [body.baseLogic],
      qualityScore: body.qualityScore ?? 70,
      freshnessScore: body.freshnessScore ?? 70,
      deprecationScore: body.deprecationScore ?? 0,
      status: review.warnings.length ? "review" : "draft",
      tags: body.tags ?? []
    });

    await emitDomainEvent({
      type: "component.created",
      tenantId: ctx.tenantId,
      requestId: ctx.requestId,
      payload: { componentId: component.id }
    });

    return { component, review };
  }
}

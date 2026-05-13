import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapPrismaComponentToResume, type ComponentWithRelations } from "@/lib/mappers/component-mapper";
import { SEED_IDS } from "@/lib/ids/stable-uuid";
import type { ResumeComponent } from "@/lib/types";

export class ComponentRepository {
  async listPublishedForTenant(tenantId: string): Promise<ResumeComponent[]> {
    const rows = await prisma.component.findMany({
      where: {
        tenantId,
        status: { in: ["approved", "published"] }
      },
      include: { role: true, domain: true, technology: true },
      orderBy: [{ qualityScore: "desc" }, { freshnessScore: "desc" }]
    });
    return rows.map((r) => mapPrismaComponentToResume(r as ComponentWithRelations));
  }

  async listAllForTenant(tenantId: string): Promise<ResumeComponent[]> {
    const rows = await prisma.component.findMany({
      where: { tenantId },
      include: { role: true, domain: true, technology: true },
      orderBy: { updatedAt: "desc" }
    });
    return rows.map((r) => mapPrismaComponentToResume(r as ComponentWithRelations));
  }

  async countByStatus(tenantId: string) {
    const grouped = await prisma.component.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true }
    });
    const map = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<string, number>;
    const all = await prisma.component.count({ where: { tenantId } });
    return {
      all,
      published: map.published ?? 0,
      draft: map.draft ?? 0,
      review: (map.review ?? 0) + (map.similarity_scan ?? 0),
      retired: map.retired ?? 0
    };
  }

  private async ensureRoleTechnologyDomain(
    tx: Prisma.TransactionClient,
    tenantId: string,
    roleName: string,
    technologyName: string,
    domainName: string
  ) {
    const roleId = SEED_IDS.role(roleName);
    const techId = SEED_IDS.technology(technologyName);
    const domainId = SEED_IDS.domain(domainName);

    await tx.role.upsert({
      where: { id: roleId },
      create: { id: roleId, name: roleName, category: "catalog" },
      update: {}
    });

    const timeline = { validFrom: 2000, validTo: 2035, aliases: [] as string[], category: "general", maturityNote: "" as string | null };
    await tx.technology.upsert({
      where: { id: techId },
      create: {
        id: techId,
        name: technologyName,
        validFrom: timeline.validFrom,
        validTo: timeline.validTo,
        aliases: timeline.aliases,
        category: timeline.category,
        maturityNote: timeline.maturityNote
      },
      update: { name: technologyName }
    });

    await tx.domain.upsert({
      where: { id: domainId },
      create: { id: domainId, name: domainName, profile: {} },
      update: {}
    });

    return { roleId, techId, domainId };
  }

  async createDraft(
    tenantId: string,
    input: {
      role: string;
      technology: string;
      domain: string;
      timelineStart: number;
      timelineEnd: number;
      componentType: string;
      intent: string;
      baseLogic: string;
      variations: string[];
      qualityScore: number;
      freshnessScore: number;
      deprecationScore: number;
      status: string;
      tags: string[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const { roleId, techId, domainId } = await this.ensureRoleTechnologyDomain(
        tx,
        tenantId,
        input.role,
        input.technology,
        input.domain
      );
      const row = await tx.component.create({
        data: {
          id: randomUUID(),
          tenantId,
          roleId,
          technologyId: techId,
          domainId,
          timelineStart: input.timelineStart,
          timelineEnd: input.timelineEnd,
          componentType: input.componentType,
          intent: input.intent,
          baseLogic: input.baseLogic,
          variations: input.variations as unknown as Prisma.InputJsonValue,
          qualityScore: input.qualityScore,
          usageCount: 0,
          freshnessScore: input.freshnessScore,
          deprecationScore: input.deprecationScore,
          status: input.status,
          tags: input.tags
        },
        include: { role: true, domain: true, technology: true }
      });
      return mapPrismaComponentToResume(row as ComponentWithRelations);
    });
  }
}

import type { Component, Domain, Role, Technology } from "@prisma/client";
import type { ResumeComponent } from "@/lib/types";

export type ComponentWithRelations = Component & {
  role: Role | null;
  domain: Domain | null;
  technology: Technology | null;
};

export function mapPrismaComponentToResume(row: ComponentWithRelations): ResumeComponent {
  const variations = Array.isArray(row.variations)
    ? (row.variations as unknown[]).filter((v): v is string => typeof v === "string")
    : [row.baseLogic];

  return {
    id: row.id,
    role: row.role?.name ?? "Data Engineer",
    technology: row.technology?.name ?? "SQL",
    domain: (row.domain?.name as ResumeComponent["domain"]) ?? "Technology",
    timelineStart: row.timelineStart,
    timelineEnd: row.timelineEnd,
    componentType: row.componentType as ResumeComponent["componentType"],
    intent: row.intent,
    baseLogic: row.baseLogic,
    variations: variations.length ? variations : [row.baseLogic],
    qualityScore: row.qualityScore,
    usageCount: row.usageCount,
    freshnessScore: row.freshnessScore,
    deprecationScore: row.deprecationScore,
    status: row.status as ResumeComponent["status"],
    tags: row.tags ?? [],
    approvedBy: row.approvedById ?? undefined
  };
}

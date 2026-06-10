import type { Job } from "@prisma/client";
import type { JobListing } from "@/lib/types";

export function mapPrismaJobToListing(row: Job): JobListing {
  return {
    id: row.id,
    source: row.source as JobListing["source"],
    title: row.title,
    company: row.company,
    location: row.location ?? "",
    domain: (row.domain as JobListing["domain"]) ?? "Technology",
    skills: row.skills,
    normalizedScore: row.normalizedScore,
    postedAt: row.postedAt ? row.postedAt.toISOString().slice(0, 10) : row.createdAt.toISOString().slice(0, 10),
    applyMode: row.applyMode as JobListing["applyMode"],
    description: row.description ?? ""
  };
}

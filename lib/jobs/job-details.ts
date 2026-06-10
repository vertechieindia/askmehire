import type { JobListing } from "@/lib/types";

const APPLY_URL_PATTERN = /Apply:\s*(https?:\/\/[^\s\n]+)/i;

export function extractJobApplyUrl(description: string | null | undefined) {
  const match = description?.match(APPLY_URL_PATTERN);
  return match?.[1]?.trim() ?? null;
}

export function jobDescriptionWithoutApplyLine(description: string | null | undefined) {
  if (!description?.trim()) {
    return "";
  }
  return description.replace(/\n*\s*Apply:\s*https?:\/\/[^\s\n]+/i, "").trim();
}

export function jobDetailSummary(job: Pick<JobListing, "title" | "company" | "location" | "source" | "postedAt" | "normalizedScore" | "applyMode">) {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    source: job.source,
    postedAt: job.postedAt,
    normalizedScore: job.normalizedScore,
    applyMode: job.applyMode
  };
}

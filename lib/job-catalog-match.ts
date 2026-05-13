import { APPLICATIONS, JOB_LISTINGS } from "@/lib/catalog";

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Map a connector demo role to a `JOB_LISTINGS[].id` when title + company align with the seed catalog. */
export function matchSyncedRoleToCatalogJobId(role: { title: string; company: string }): string | null {
  const nt = norm(role.title);
  const nc = norm(role.company);
  for (const job of JOB_LISTINGS) {
    if (norm(job.title) === nt && norm(job.company) === nc) {
      return job.id;
    }
  }
  for (const job of JOB_LISTINGS) {
    if (norm(job.company) !== nc) {
      continue;
    }
    if (nt.includes(norm(job.title)) || norm(job.title).includes(nt)) {
      return job.id;
    }
  }
  return null;
}

const seededResumeLegacyIds = new Set(APPLICATIONS.map((a) => a.resumeId));

/** Prefer the profile's primary resume when it exists in seed data; otherwise a stable seeded resume for FK safety. */
export function pickSeededResumeLegacyId(primaryResumeId: string | undefined): string {
  if (primaryResumeId && seededResumeLegacyIds.has(primaryResumeId)) {
    return primaryResumeId;
  }
  return APPLICATIONS[0]?.resumeId ?? "resume-bank-data-v3";
}

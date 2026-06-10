import type { ConnectorSyncParams, JobConnectorAdapter, NormalizedConnectorJob } from "@/lib/integrations/jobs/types";
import {
  normalizeStoredCredentialRef,
  resolveConnectorCredentialRef
} from "@/lib/integrations/jobs/connector-env";
import {
  adzunaJobCompany,
  adzunaJobDescription,
  adzunaJobDomain,
  adzunaJobLocation,
  adzunaJobPostedAt,
  buildAdzunaSearchWhat,
  inferSkillsFromAdzunaText,
  scoreAdzunaJobMatch,
  searchAdzunaJobs,
  parseAdzunaCredentials
} from "@/lib/integrations/jobs/adzuna.client";

export const adzunaJobAdapter: JobConnectorAdapter = {
  portal: "Adzuna",
  async sync(params: ConnectorSyncParams) {
    const stored =
      normalizeStoredCredentialRef("Adzuna", params.credentialRef) ??
      resolveConnectorCredentialRef("Adzuna");
    const creds = parseAdzunaCredentials(stored);
    if (!creds) {
      throw new Error(
        "Adzuna is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env and reconnect."
      );
    }

    const what = buildAdzunaSearchWhat(params.query);
    const where = process.env.ADZUNA_SEARCH_WHERE?.trim();
    const { results } = await searchAdzunaJobs(creds, {
      what,
      where,
      resultsPerPage: 50,
      maxPages: Number(process.env.ADZUNA_SYNC_MAX_PAGES ?? 3)
    });

    if (results.length === 0) {
      throw new Error(`Adzuna returned no jobs for "${what}" in ${creds.country.toUpperCase()}. Try a different search.`);
    }

    return results.map((job) => {
      const description = adzunaJobDescription(job);
      const plain = `${job.title} ${description}`;
      return {
        externalId: String(job.id),
        source: "Adzuna",
        title: job.title,
        company: adzunaJobCompany(job),
        location: adzunaJobLocation(job),
        domain: adzunaJobDomain(job),
        skills: inferSkillsFromAdzunaText(plain),
        description,
        normalizedScore: scoreAdzunaJobMatch(job, params.query, params.keywords),
        applyMode: "human_assisted",
        postedAt: adzunaJobPostedAt(job)
      } satisfies NormalizedConnectorJob;
    });
  }
};

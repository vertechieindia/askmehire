import type { ConnectorSyncParams, JobConnectorAdapter, NormalizedConnectorJob } from "@/lib/integrations/jobs/types";
import {
  normalizeStoredCredentialRef,
  resolveConnectorCredentialRef
} from "@/lib/integrations/jobs/connector-env";
import {
  buildJSearchQuery,
  inferSkillsFromJSearchText,
  jsearchJobCompany,
  jsearchJobDescription,
  jsearchJobDomain,
  jsearchJobLocation,
  jsearchJobPostedAt,
  parseJSearchCredentials,
  scoreJSearchJobMatch,
  searchJSearchJobs
} from "@/lib/integrations/jobs/jsearch.client";

export const jsearchJobAdapter: JobConnectorAdapter = {
  portal: "JSearch",
  async sync(params: ConnectorSyncParams) {
    const stored =
      normalizeStoredCredentialRef("JSearch", params.credentialRef) ??
      resolveConnectorCredentialRef("JSearch");
    const creds = parseJSearchCredentials(stored);
    if (!creds) {
      throw new Error("JSearch is not configured. Set JSEARCH_RAPIDAPI_KEY in .env and reconnect.");
    }

    const query = buildJSearchQuery(params.query);
    const { results } = await searchJSearchJobs(creds, { query });

    if (results.length === 0) {
      throw new Error(`JSearch returned no jobs for "${query}". Try a different search.`);
    }

    return results.map((job) => {
      const description = jsearchJobDescription(job);
      const plain = `${job.job_title ?? ""} ${description}`;
      return {
        externalId: job.job_id,
        source: "JSearch",
        title: job.job_title?.trim() || "Untitled role",
        company: jsearchJobCompany(job),
        location: jsearchJobLocation(job),
        domain: jsearchJobDomain(job),
        skills: inferSkillsFromJSearchText(plain),
        description,
        normalizedScore: scoreJSearchJobMatch(job, params.query, params.keywords),
        applyMode: "human_assisted",
        postedAt: jsearchJobPostedAt(job)
      } satisfies NormalizedConnectorJob;
    });
  }
};

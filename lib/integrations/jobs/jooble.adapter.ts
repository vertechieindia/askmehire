import type { ConnectorSyncParams, JobConnectorAdapter, NormalizedConnectorJob } from "@/lib/integrations/jobs/types";
import {
  buildJoobleKeywords,
  getJoobleCredentialsFromEnv,
  inferSkillsFromJoobleText,
  joobleJobCompany,
  joobleJobDescription,
  joobleJobDomain,
  joobleJobExternalId,
  joobleJobLocation,
  joobleJobPostedAt,
  scoreJoobleJobMatch,
  searchJoobleJobs
} from "@/lib/integrations/jobs/jooble.client";

export const joobleJobAdapter: JobConnectorAdapter = {
  portal: "Jooble",
  async sync(params: ConnectorSyncParams) {
    const creds = getJoobleCredentialsFromEnv();
    if (!creds) {
      throw new Error("Jooble is not configured. Set JOOBLE_API_KEY in .env, restart the server, then Connect.");
    }

    const keywords = buildJoobleKeywords(params.query);
    const { results } = await searchJoobleJobs(creds, { keywords });

    if (results.length === 0) {
      throw new Error(`Jooble returned no jobs for "${keywords}". Try a different search.`);
    }

    return results.map((job) => {
      const description = joobleJobDescription(job);
      const plain = `${job.title ?? ""} ${description}`;
      return {
        externalId: joobleJobExternalId(job),
        source: "Jooble",
        title: job.title?.trim() || "Untitled role",
        company: joobleJobCompany(job),
        location: joobleJobLocation(job),
        domain: joobleJobDomain(job),
        skills: inferSkillsFromJoobleText(plain),
        description,
        normalizedScore: scoreJoobleJobMatch(job, params.query, params.keywords),
        applyMode: "human_assisted",
        postedAt: joobleJobPostedAt(job)
      } satisfies NormalizedConnectorJob;
    });
  }
};

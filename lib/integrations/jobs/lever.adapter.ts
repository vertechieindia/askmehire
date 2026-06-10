import type { ConnectorSyncParams, JobConnectorAdapter, NormalizedConnectorJob } from "@/lib/integrations/jobs/types";
import {
  normalizeStoredCredentialRef,
  resolveConnectorCredentialRef
} from "@/lib/integrations/jobs/connector-env";
import {
  fetchLeverPostings,
  inferSkillsFromLeverText,
  leverPostingDepartment,
  leverPostingDescription,
  leverPostingLocation,
  leverPostingPostedAt,
  parseLeverSiteSlugs,
  scoreLeverPostingMatch
} from "@/lib/integrations/jobs/lever.client";

export const leverJobAdapter: JobConnectorAdapter = {
  portal: "Lever",
  async sync(params: ConnectorSyncParams) {
    const credentialRef =
      normalizeStoredCredentialRef("Lever", params.credentialRef) ??
      resolveConnectorCredentialRef("Lever");
    const siteSlugs = parseLeverSiteSlugs(credentialRef);
    if (siteSlugs.length === 0) {
      throw new Error("Lever is not configured. Set LEVER_SITE_SLUG in .env and reconnect.");
    }

    const normalized: NormalizedConnectorJob[] = [];
    const siteErrors: string[] = [];

    for (const siteSlug of siteSlugs) {
      try {
        const postings = await fetchLeverPostings(siteSlug);
        const company = siteSlug.charAt(0).toUpperCase() + siteSlug.slice(1);

        for (const job of postings) {
          const description = leverPostingDescription(job);
          const plain = `${job.text} ${description}`;
          normalized.push({
            externalId: `${siteSlug}:${job.id}`,
            source: "Lever",
            title: job.text,
            company,
            location: leverPostingLocation(job),
            domain: leverPostingDepartment(job),
            skills: inferSkillsFromLeverText(plain),
            description: `${description}\n\nApply: ${job.applyUrl ?? job.hostedUrl ?? ""}`.trim(),
            normalizedScore: scoreLeverPostingMatch(job, params.query, params.keywords),
            applyMode: "connector_ready",
            postedAt: leverPostingPostedAt(job)
          });
        }
      } catch (err) {
        siteErrors.push(
          `${siteSlug}: ${err instanceof Error ? err.message : "Lever site fetch failed."}`
        );
      }
    }

    if (normalized.length === 0) {
      throw new Error(
        siteErrors.length > 0
          ? `No Lever jobs imported. ${siteErrors.join(" | ")}`
          : "No public Lever postings found for configured site slugs."
      );
    }

    return normalized;
  }
};

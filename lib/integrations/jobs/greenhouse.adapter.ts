import type { ConnectorSyncParams, JobConnectorAdapter, NormalizedConnectorJob } from "@/lib/integrations/jobs/types";
import {
  normalizeStoredCredentialRef,
  resolveConnectorCredentialRef
} from "@/lib/integrations/jobs/connector-env";
import {
  fetchGreenhouseBoard,
  fetchGreenhouseJobs,
  greenhouseJobDepartment,
  greenhouseJobPostedAt,
  greenhouseJobToPlainDescription,
  inferSkillsFromText,
  parseGreenhouseBoardTokens,
  scoreGreenhouseJobMatch
} from "@/lib/integrations/jobs/greenhouse.client";

export const greenhouseJobAdapter: JobConnectorAdapter = {
  portal: "Greenhouse",
  async sync(params: ConnectorSyncParams) {
    const credentialRef =
      normalizeStoredCredentialRef("Greenhouse", params.credentialRef) ??
      resolveConnectorCredentialRef("Greenhouse");
    const boardTokens = parseGreenhouseBoardTokens(credentialRef);
    if (boardTokens.length === 0) {
      throw new Error("Greenhouse is not configured. Set GREENHOUSE_BOARD_TOKEN in .env and reconnect.");
    }

    const normalized: NormalizedConnectorJob[] = [];
    const boardErrors: string[] = [];

    for (const boardToken of boardTokens) {
      try {
        const [board, jobs] = await Promise.all([
          fetchGreenhouseBoard(boardToken),
          fetchGreenhouseJobs(boardToken)
        ]);
        const company = board.name?.trim() || boardToken;

        for (const job of jobs) {
          const description = greenhouseJobToPlainDescription(job);
          const plain = `${job.title} ${description}`;
          normalized.push({
            externalId: `${boardToken}:${job.id}`,
            source: "Greenhouse",
            title: job.title,
            company,
            location: job.location?.name ?? "",
            domain: greenhouseJobDepartment(job),
            skills: inferSkillsFromText(plain),
            description: `${description}\n\nApply: ${job.absolute_url}`,
            normalizedScore: scoreGreenhouseJobMatch(job, params.query, params.keywords),
            applyMode: "connector_ready",
            postedAt: greenhouseJobPostedAt(job)
          });
        }
      } catch (err) {
        boardErrors.push(
          `${boardToken}: ${err instanceof Error ? err.message : "Greenhouse board fetch failed."}`
        );
      }
    }

    if (normalized.length === 0) {
      throw new Error(
        boardErrors.length > 0
          ? `No Greenhouse jobs imported. ${boardErrors.join(" | ")}`
          : "No public Greenhouse jobs found for configured board tokens."
      );
    }

    return normalized;
  }
};

import { JobConnectorRepository } from "@/repositories/job-connector.repository";
import { JobRepository } from "@/repositories/job.repository";
import { getJobConnectorAdapter } from "@/lib/integrations/jobs/registry";
import { getSyncConnectorMeta } from "@/lib/integrations/jobs/connector-meta";
import {
  connectorEnvVarHint,
  isConnectorEnvConfigured,
  resolveConnectorCredentialRef
} from "@/lib/integrations/jobs/connector-env";
import { probeAdzunaCredentials, parseAdzunaCredentials } from "@/lib/integrations/jobs/adzuna.client";
import { fetchGreenhouseJobs, parseGreenhouseBoardTokens } from "@/lib/integrations/jobs/greenhouse.client";
import { parseJSearchCredentials, probeJSearchCredentials } from "@/lib/integrations/jobs/jsearch.client";
import { parseJoobleCredentials } from "@/lib/integrations/jobs/jooble.client";
import { parseLeverSiteSlugs, probeLeverSite } from "@/lib/integrations/jobs/lever.client";
import {
  EXTERNAL_CONNECTOR_PLATFORMS,
  isExternalConnectorPlatform,
  type ExternalConnectorPlatform,
  type JobConnectorStatusRow
} from "@/lib/integrations/jobs/types";
import type { ApiContext } from "@/lib/http/with-api-handler";
import { AppError } from "@/lib/http/api-errors";
import { emitDomainEvent } from "@/events/domain-events";

export class JobConnectorService {
  constructor(
    private readonly connectorRepo = new JobConnectorRepository(),
    private readonly jobRepo = new JobRepository()
  ) {}

  async listStatuses(ctx: ApiContext): Promise<JobConnectorStatusRow[]> {
    const rows = await this.connectorRepo.listForTenant(ctx.tenantId);
    return rows.map((row) => {
      const portal = row.portalName as ExternalConnectorPlatform;
      const meta = getSyncConnectorMeta(portal);
      const envConfigured = isConnectorEnvConfigured(portal);
      return {
        portalName: portal,
        authMode: row.authMode,
        applyMode: row.applyMode,
        status: row.status as JobConnectorStatusRow["status"],
        refreshEverySeconds: row.refreshEverySeconds,
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        setupAction: envConfigured
          ? (meta?.setupAction ?? "Click Connect to enable sync for this portal.")
          : `Not configured. Set ${connectorEnvVarHint(portal)} in .env and restart the server.`,
        envConfigured
      };
    });
  }

  async connect(ctx: ApiContext, portal: string) {
    if (!isExternalConnectorPlatform(portal)) {
      throw new AppError("INVALID_CONNECTOR", `Unsupported connector: ${portal}`, 400);
    }

    const credentialRef = resolveConnectorCredentialRef(portal);
    if (!credentialRef) {
      throw new AppError(
        "CONNECTOR_NOT_CONFIGURED",
        `Set ${connectorEnvVarHint(portal)} in .env and restart the server before connecting ${portal}.`,
        400
      );
    }

    if (portal === "Greenhouse") {
      const boardTokens = parseGreenhouseBoardTokens(credentialRef);
      let boardsWithJobs = 0;
      for (const token of boardTokens) {
        try {
          const jobs = await fetchGreenhouseJobs(token);
          if (jobs.length > 0) {
            boardsWithJobs += 1;
          }
        } catch {
          // skip invalid or private boards during connect probe
        }
      }
      if (boardsWithJobs === 0) {
        throw new AppError(
          "GREENHOUSE_NO_JOBS",
          "No public Greenhouse jobs found for configured board tokens. Check GREENHOUSE_BOARD_TOKEN in .env.",
          400
        );
      }
    } else if (portal === "Lever") {
      const siteSlugs = parseLeverSiteSlugs(credentialRef);
      let sitesWithJobs = 0;
      for (const slug of siteSlugs) {
        const probe = await probeLeverSite(slug);
        if (probe.ok) {
          sitesWithJobs += 1;
        }
      }
      if (sitesWithJobs === 0) {
        throw new AppError(
          "LEVER_SITE_NO_JOBS",
          "No public Lever postings found for configured site slugs. Check LEVER_SITE_SLUG in .env.",
          400
        );
      }
    } else if (portal === "Adzuna") {
      const creds = parseAdzunaCredentials(credentialRef);
      if (!creds) {
        throw new AppError("ADZUNA_CREDENTIALS_REQUIRED", "Adzuna credentials are missing from .env.", 400);
      }
      const probe = await probeAdzunaCredentials(creds);
      if (!probe.ok) {
        throw new AppError("ADZUNA_PROBE_FAILED", probe.message, 400);
      }
    } else if (portal === "JSearch") {
      const creds = parseJSearchCredentials(credentialRef);
      if (!creds) {
        throw new AppError("JSEARCH_CREDENTIALS_REQUIRED", "JSearch credentials are missing from .env.", 400);
      }
      const probe = await probeJSearchCredentials(creds);
      if (!probe.ok) {
        throw new AppError("JSEARCH_PROBE_FAILED", probe.message, 400);
      }
    } else if (portal === "Jooble") {
      const creds = parseJoobleCredentials(credentialRef);
      if (!creds) {
        throw new AppError("JOOBLE_CREDENTIALS_REQUIRED", "Jooble credentials are missing from .env.", 400);
      }
      // Jooble often returns 403 until API registration is approved — connect using env key; sync validates live access.
    }

    await this.connectorRepo.connect(ctx.tenantId, portal, credentialRef);
    return this.listStatuses(ctx);
  }

  async disconnect(ctx: ApiContext, portal: string) {
    if (!isExternalConnectorPlatform(portal)) {
      throw new AppError("INVALID_CONNECTOR", `Unsupported connector: ${portal}`, 400);
    }
    await this.connectorRepo.disconnect(ctx.tenantId, portal);
    await this.jobRepo.purgeJobsBySource(ctx.tenantId, portal);
    return this.listStatuses(ctx);
  }

  async sync(
    ctx: ApiContext,
    input: { query?: string; keywords?: string[]; portals?: string[] }
  ) {
    const query = (input.query ?? "").trim();
    const keywords = input.keywords ?? [];
    const requested = (input.portals ?? []).filter(isExternalConnectorPlatform);
    const statuses = await this.connectorRepo.listForTenant(ctx.tenantId);
    const connected = statuses.filter((row) => row.status === "connected");
    const targets =
      requested.length > 0
        ? connected.filter((row) => requested.includes(row.portalName as ExternalConnectorPlatform))
        : connected;

    await this.jobRepo.purgeDisallowedSources(ctx.tenantId);

    const results: Array<{
      portal: ExternalConnectorPlatform;
      imported: number;
      jobs: Awaited<ReturnType<JobRepository["upsertConnectorJob"]>>[];
    }> = [];
    const errors: Array<{ portal: ExternalConnectorPlatform; message: string }> = [];

    for (const connector of targets) {
      const portal = connector.portalName as ExternalConnectorPlatform;
      try {
        const adapter = getJobConnectorAdapter(portal);
        const credentialRef = resolveConnectorCredentialRef(portal) ?? connector.credentialRef;
        const fetched = await adapter.sync({
          tenantId: ctx.tenantId,
          portal,
          query,
          keywords,
          credentialRef
        });
        const jobs = [];
        for (const job of fetched) {
          jobs.push(await this.jobRepo.upsertConnectorJob(ctx.tenantId, job));
        }
        await this.connectorRepo.markSynced(ctx.tenantId, portal);
        results.push({ portal, imported: jobs.length, jobs });
      } catch (err) {
        errors.push({
          portal,
          message: err instanceof Error ? err.message : "Connector sync failed."
        });
      }
    }

    if (results.length > 0 || errors.length === 0) {
      await emitDomainEvent({
        type: "jobs.synced",
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
        payload: {
          query,
          portals: results.map((item) => item.portal),
          imported: results.reduce((sum, item) => sum + item.imported, 0)
        }
      });
    }

    return {
      query,
      syncedAt: new Date().toISOString(),
      connectedPortals: connected.map((row) => row.portalName),
      availablePortals: [...EXTERNAL_CONNECTOR_PLATFORMS],
      results,
      errors
    };
  }
}


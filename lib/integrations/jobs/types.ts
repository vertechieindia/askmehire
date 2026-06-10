import type { JobListing } from "@/lib/types";

/** Live job sync connectors (credentials from server .env only). */
export const EXTERNAL_CONNECTOR_PLATFORMS = ["Adzuna", "JSearch", "Jooble", "Greenhouse", "Lever"] as const;

/** Sources shown in unified job search (internal postings + live connectors). */
export const INDEXED_JOB_SOURCES = ["Internal", ...EXTERNAL_CONNECTOR_PLATFORMS] as const;

export type IndexedJobSource = (typeof INDEXED_JOB_SOURCES)[number];

export type ExternalConnectorPlatform = (typeof EXTERNAL_CONNECTOR_PLATFORMS)[number];

export function isExternalConnectorPlatform(name: string): name is ExternalConnectorPlatform {
  return resolveExternalConnectorPlatform(name) !== null;
}

export function resolveExternalConnectorPlatform(name: string): ExternalConnectorPlatform | null {
  const normalized = name.trim().toLowerCase();
  return EXTERNAL_CONNECTOR_PLATFORMS.find((portal) => portal.toLowerCase() === normalized) ?? null;
}

export interface NormalizedConnectorJob {
  externalId: string;
  source: JobListing["source"];
  title: string;
  company: string;
  location: string;
  domain: string;
  skills: string[];
  description: string;
  normalizedScore: number;
  applyMode: JobListing["applyMode"];
  postedAt: string;
}

export interface ConnectorSyncParams {
  tenantId: string;
  portal: ExternalConnectorPlatform;
  query: string;
  keywords?: string[];
  credentialRef?: string | null;
}

export interface JobConnectorAdapter {
  portal: ExternalConnectorPlatform;
  sync(params: ConnectorSyncParams): Promise<NormalizedConnectorJob[]>;
}

export interface JobConnectorStatusRow {
  portalName: ExternalConnectorPlatform;
  authMode: string;
  applyMode: string;
  status: "not_connected" | "connected" | "needs_review" | "rate_limited";
  refreshEverySeconds: number;
  lastSyncedAt: string | null;
  setupAction: string;
  envConfigured: boolean;
}

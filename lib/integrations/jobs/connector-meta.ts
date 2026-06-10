/** Metadata for live job sync connectors. */
export interface SyncConnectorMeta {
  portalName: string;
  focus: string;
  authMode: string;
  applyMode: string;
  refreshEverySeconds: number;
  setupAction: string;
  safetyControls: string[];
}

export const SYNC_CONNECTOR_META: Record<string, SyncConnectorMeta> = {
  Greenhouse: {
    portalName: "Greenhouse",
    focus: "Live jobs from your Greenhouse careers board (ATS)",
    authMode: "env_board_token",
    applyMode: "connector_ready",
    refreshEverySeconds: 300,
    setupAction: "Set GREENHOUSE_BOARD_TOKEN in .env (comma-separated board slugs from boards.greenhouse.io/yourcompany), restart server, then Connect.",
    safetyControls: ["server env credentials", "public Job Board API", "jd hash dedupe"]
  },
  Lever: {
    portalName: "Lever",
    focus: "Live jobs from your Lever careers site (ATS)",
    authMode: "env_site_slug",
    applyMode: "connector_ready",
    refreshEverySeconds: 300,
    setupAction: "Set LEVER_SITE_SLUG in .env (comma-separated slugs from jobs.lever.co/yourcompany), restart server, then Connect.",
    safetyControls: ["server env credentials", "public postings API", "jd hash dedupe"]
  },
  Adzuna: {
    portalName: "Adzuna",
    focus: "Aggregated job listings from the Adzuna search API",
    authMode: "env_app_key",
    applyMode: "human_assisted",
    refreshEverySeconds: 300,
    setupAction:
      "Set ADZUNA_APP_ID, ADZUNA_APP_KEY, and ADZUNA_COUNTRY in .env, restart server, then Connect.",
    safetyControls: ["server env credentials", "search-scoped import", "redirect apply URLs", "jd hash dedupe"]
  },
  JSearch: {
    portalName: "JSearch",
    focus: "Aggregated job listings from Google for Jobs via RapidAPI JSearch",
    authMode: "env_rapidapi_key",
    applyMode: "human_assisted",
    refreshEverySeconds: 300,
    setupAction: "Set JSEARCH_RAPIDAPI_KEY and JSEARCH_COUNTRY in .env, restart server, then Connect.",
    safetyControls: ["server env credentials", "search-scoped import", "redirect apply URLs", "jd hash dedupe"]
  },
  Jooble: {
    portalName: "Jooble",
    focus: "Aggregated job listings from the Jooble REST API",
    authMode: "env_api_key",
    applyMode: "human_assisted",
    refreshEverySeconds: 300,
    setupAction: "Set JOOBLE_API_KEY and JOOBLE_REFERER=https://www.askmehire.com/ in .env (registered Jooble site, not localhost), restart server, then Connect.",
    safetyControls: ["server env credentials", "search-scoped import", "redirect apply URLs", "jd hash dedupe"]
  }
};

export function getSyncConnectorMeta(portalName: string): SyncConnectorMeta | undefined {
  return SYNC_CONNECTOR_META[portalName];
}

import {
  isValidAdzunaAppId,
  isValidAdzunaAppKey,
  parseAdzunaCredentials,
  serializeAdzunaCredentials
} from "@/lib/integrations/jobs/adzuna.client";
import {
  getGreenhouseBoardTokensFromEnv,
  parseGreenhouseBoardTokens,
  serializeGreenhouseBoardTokens
} from "@/lib/integrations/jobs/greenhouse.client";
import {
  getJSearchCredentialsFromEnv,
  isValidJSearchApiKey,
  parseJSearchCredentials,
  serializeJSearchCredentials
} from "@/lib/integrations/jobs/jsearch.client";
import {
  getJoobleCredentialsFromEnv,
  isValidJoobleApiKey,
  parseJoobleCredentials,
  serializeJoobleCredentials
} from "@/lib/integrations/jobs/jooble.client";
import {
  getLeverSiteSlugsFromEnv,
  parseLeverSiteSlugs,
  serializeLeverSiteSlugs
} from "@/lib/integrations/jobs/lever.client";
import type { ExternalConnectorPlatform } from "@/lib/integrations/jobs/types";

export function isConnectorEnvConfigured(portal: ExternalConnectorPlatform) {
  return resolveConnectorCredentialRef(portal) !== null;
}

export function resolveConnectorCredentialRef(portal: ExternalConnectorPlatform): string | null {
  if (portal === "Greenhouse") {
    const tokens = getGreenhouseBoardTokensFromEnv();
    return tokens.length > 0 ? serializeGreenhouseBoardTokens(tokens) : null;
  }
  if (portal === "Lever") {
    const slugs = getLeverSiteSlugsFromEnv();
    return slugs.length > 0 ? serializeLeverSiteSlugs(slugs) : null;
  }
  if (portal === "Adzuna") {
    const creds = parseAdzunaCredentials(null);
    if (!creds || !isValidAdzunaAppId(creds.appId) || !isValidAdzunaAppKey(creds.appKey)) {
      return null;
    }
    return serializeAdzunaCredentials(creds);
  }
  if (portal === "JSearch") {
    const creds = getJSearchCredentialsFromEnv();
    if (!creds || !isValidJSearchApiKey(creds.apiKey)) {
      return null;
    }
    return serializeJSearchCredentials(creds);
  }
  if (portal === "Jooble") {
    const creds = getJoobleCredentialsFromEnv();
    if (!creds || !isValidJoobleApiKey(creds.apiKey)) {
      return null;
    }
    return serializeJoobleCredentials(creds);
  }
  return null;
}

export function connectorEnvVarHint(portal: ExternalConnectorPlatform) {
  if (portal === "Greenhouse") {
    return "GREENHOUSE_BOARD_TOKEN";
  }
  if (portal === "Lever") {
    return "LEVER_SITE_SLUG";
  }
  if (portal === "JSearch") {
    return "JSEARCH_RAPIDAPI_KEY, JSEARCH_COUNTRY";
  }
  if (portal === "Jooble") {
    return "JOOBLE_API_KEY, JOOBLE_LOCATION";
  }
  return "ADZUNA_APP_ID, ADZUNA_APP_KEY, ADZUNA_COUNTRY";
}

export function normalizeStoredCredentialRef(portal: ExternalConnectorPlatform, ref: string | null | undefined) {
  if (portal === "Greenhouse") {
    const tokens = parseGreenhouseBoardTokens(ref);
    return tokens.length > 0 ? serializeGreenhouseBoardTokens(tokens) : null;
  }
  if (portal === "Lever") {
    const slugs = parseLeverSiteSlugs(ref);
    return slugs.length > 0 ? serializeLeverSiteSlugs(slugs) : null;
  }
  if (portal === "Adzuna") {
    const creds = parseAdzunaCredentials(ref);
    if (!creds || !isValidAdzunaAppId(creds.appId) || !isValidAdzunaAppKey(creds.appKey)) {
      return null;
    }
    return serializeAdzunaCredentials(creds);
  }
  if (portal === "JSearch") {
    const creds = parseJSearchCredentials(ref);
    if (!creds || !isValidJSearchApiKey(creds.apiKey)) {
      return null;
    }
    return serializeJSearchCredentials(creds);
  }
  if (portal === "Jooble") {
    const creds = parseJoobleCredentials(ref);
    if (!creds || !isValidJoobleApiKey(creds.apiKey)) {
      return null;
    }
    return serializeJoobleCredentials(creds);
  }
  return null;
}

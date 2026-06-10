export interface JoobleCredentials {
  apiKey: string;
  location: string;
}

export interface JoobleJobResult {
  id?: string | number;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
}

export interface JoobleSearchResponse {
  totalCount?: number;
  jobs?: JoobleJobResult[];
}

const GUID_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidJoobleApiKey(apiKey: string) {
  return GUID_KEY_PATTERN.test(apiKey.trim());
}

export function serializeJoobleCredentials(creds: JoobleCredentials) {
  return JSON.stringify({
    apiKey: creds.apiKey.trim(),
    location: creds.location.trim()
  });
}

export function parseJoobleCredentials(ref: string | null | undefined): JoobleCredentials | null {
  const fromEnv = (): JoobleCredentials | null => {
    const apiKey = process.env.JOOBLE_API_KEY?.trim();
    if (!apiKey || !isValidJoobleApiKey(apiKey)) {
      return null;
    }
    return {
      apiKey,
      location: process.env.JOOBLE_LOCATION?.trim() ?? ""
    };
  };

  // Live .env key always wins so API key rotations apply without reconnect.
  const envCreds = fromEnv();
  if (envCreds) {
    return envCreds;
  }

  if (!ref?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(ref) as Partial<JoobleCredentials>;
    if (parsed.apiKey?.trim() && isValidJoobleApiKey(parsed.apiKey)) {
      return {
        apiKey: parsed.apiKey.trim(),
        location: parsed.location?.trim() ?? ""
      };
    }
  } catch {
    if (isValidJoobleApiKey(ref)) {
      return { apiKey: ref.trim(), location: "" };
    }
  }

  return null;
}

export function getJoobleCredentialsFromEnv() {
  return parseJoobleCredentials(null);
}

function joobleApiBase() {
  return process.env.JOOBLE_API_BASE?.trim().replace(/\/+$/, "") || "https://jooble.org/api";
}

export function buildJoobleKeywords(query: string) {
  const q = query.trim();
  return q || "software developer";
}

function joobleReferer() {
  const raw = process.env.JOOBLE_REFERER?.trim() || "https://www.askmehire.com/";
  if (/^https?:\/\//i.test(raw)) {
    return raw.endsWith("/") ? raw : `${raw}/`;
  }
  return `https://${raw.replace(/^\/+|\/+$/g, "")}/`;
}

function joobleRequestHeaders() {
  return {
    "Content-Type": "application/json",
    Referer: joobleReferer()
  };
}

async function readJoobleErrorMessage(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { message?: string; errorCode?: number };
    if (json.message) {
      return `Jooble API: ${json.message}. Confirm JOOBLE_API_KEY and JOOBLE_REFERER=https://www.askmehire.com/ match your Jooble registration.`;
    }
  } catch {
    // not JSON
  }
  if (
    text.includes("301 Moved Permanently") ||
    text.includes("cloudflare") ||
    text.includes("__CF$cv$params")
  ) {
    return "Jooble blocked this server request (Cloudflare 403). Reply to your Jooble API key email and ask them to enable server-side access for https://www.askmehire.com (or test Sync after deploying to production). Other connectors still work.";
  }
  if (text.toLowerCase().includes("registered users")) {
    return "Jooble denied access (403): API access is limited to approved registered users. This is not a localhost referer issue — keep JOOBLE_REFERER=https://www.askmehire.com/ and ask Jooble support to approve your API key or whitelist your server IP.";
  }
  if (response.status === 403) {
    return "Jooble API rejected the request (403). Verify JOOBLE_API_KEY and JOOBLE_REFERER=https://www.askmehire.com/, then contact Jooble if it still fails.";
  }
  return `Jooble search failed (${response.status}). Check API key and quota.`;
}

export async function probeJoobleCredentials(creds: JoobleCredentials) {
  try {
    const response = await searchJoobleJobs(creds, { keywords: "developer", page: 1, maxPages: 1 });
    if (response.results.length === 0) {
      return {
        ok: false as const,
        message: "Jooble API accepted the key but returned no jobs. Check JOOBLE_LOCATION or try a broader search."
      };
    }
    return { ok: true as const, sampleCount: response.results.length };
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Jooble probe failed."
    };
  }
}

export async function searchJoobleJobs(
  creds: JoobleCredentials,
  input: { keywords: string; location?: string; page?: number; maxPages?: number }
) {
  const base = joobleApiBase();
  const maxPages = Math.min(Math.max(input.maxPages ?? Number(process.env.JOOBLE_SYNC_MAX_PAGES ?? 3), 1), 10);
  const startPage = Math.max(input.page ?? 1, 1);
  const location = (input.location ?? creds.location).trim();
  const all: JoobleJobResult[] = [];
  let totalCount: number | undefined;

  for (let page = startPage; page < startPage + maxPages; page += 1) {
    const body: Record<string, string> = {
      keywords: input.keywords,
      page: String(page),
      companysearch: "false"
    };
    if (location) {
      body.location = location;
    }

    const response = await fetch(`${base}/${creds.apiKey}`, {
      method: "POST",
      headers: joobleRequestHeaders(),
      body: JSON.stringify(body),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(await readJoobleErrorMessage(response));
    }

    const payload = (await response.json()) as JoobleSearchResponse;
    totalCount = payload.totalCount;
    const batch = payload.jobs ?? [];
    if (batch.length === 0) {
      break;
    }
    all.push(...batch);
  }

  return { results: all, totalCount };
}

export function joobleJobExternalId(job: JoobleJobResult) {
  if (job.id !== undefined && job.id !== null && String(job.id).trim()) {
    return String(job.id);
  }
  if (job.link?.trim()) {
    return job.link.trim();
  }
  return `${job.title ?? "job"}:${job.company ?? "unknown"}:${job.location ?? ""}`;
}

export function joobleJobCompany(job: JoobleJobResult) {
  return job.company?.trim() || "Unknown employer";
}

export function joobleJobLocation(job: JoobleJobResult) {
  return job.location?.trim() || "";
}

export function joobleJobDomain(job: JoobleJobResult) {
  return job.type?.trim() || "General";
}

export function joobleJobPostedAt(job: JoobleJobResult) {
  if (job.updated) {
    const parsed = new Date(job.updated);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function joobleJobDescription(job: JoobleJobResult) {
  const parts = [job.snippet?.trim() || ""];
  if (job.salary?.trim()) {
    parts.push(`Salary: ${job.salary.trim()}`);
  }
  if (job.source?.trim()) {
    parts.push(`Source: ${job.source.trim()}`);
  }
  if (job.link?.trim()) {
    parts.push(`Apply: ${job.link.trim()}`);
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

export function inferSkillsFromJoobleText(text: string): string[] {
  const catalog = [
    "React",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Python",
    "Java",
    "AWS",
    "SQL",
    "Next.js",
    "GraphQL",
    "Kubernetes",
    "Go",
    "Frontend",
    "Backend",
    "Engineering"
  ];
  const lower = text.toLowerCase();
  return catalog.filter((skill) => lower.includes(skill.toLowerCase())).slice(0, 8);
}

export function scoreJoobleJobMatch(job: JoobleJobResult, query: string, keywords: string[] = []) {
  const haystack = `${job.title ?? ""} ${job.snippet ?? ""} ${joobleJobLocation(job)} ${joobleJobCompany(job)}`.toLowerCase();
  const terms = [query, ...keywords].map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) {
    return 80;
  }
  let score = 50;
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += 12;
    }
  }
  return Math.min(100, score);
}

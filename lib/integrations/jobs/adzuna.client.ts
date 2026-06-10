export interface AdzunaCredentials {
  appId: string;
  appKey: string;
  country: string;
}

export interface AdzunaJobResult {
  id: string;
  title: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  category?: { label?: string; tag?: string };
}

export interface AdzunaSearchResponse {
  count?: number;
  results?: AdzunaJobResult[];
}

const SUPPORTED_COUNTRIES = new Set(["us", "gb", "au", "ca", "de", "fr", "in", "nz", "sg", "za", "at", "be", "br", "ch", "es", "it", "mx", "nl", "pl"]);

export function normalizeAdzunaCountry(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidAdzunaCountry(country: string) {
  return SUPPORTED_COUNTRIES.has(normalizeAdzunaCountry(country));
}

export function isValidAdzunaAppId(appId: string) {
  return /^[a-z0-9]{4,64}$/i.test(appId.trim());
}

export function isValidAdzunaAppKey(appKey: string) {
  return /^[a-f0-9]{16,128}$/i.test(appKey.trim());
}

export function serializeAdzunaCredentials(creds: AdzunaCredentials) {
  return JSON.stringify({
    appId: creds.appId.trim(),
    appKey: creds.appKey.trim(),
    country: normalizeAdzunaCountry(creds.country || "us")
  });
}

export function parseAdzunaCredentials(ref: string | null | undefined): AdzunaCredentials | null {
  const fromEnv = (): AdzunaCredentials | null => {
    const appId = process.env.ADZUNA_APP_ID?.trim();
    const appKey = process.env.ADZUNA_APP_KEY?.trim();
    if (!appId || !appKey) {
      return null;
    }
    return {
      appId,
      appKey,
      country: normalizeAdzunaCountry(process.env.ADZUNA_COUNTRY ?? "us")
    };
  };

  if (!ref?.trim()) {
    return fromEnv();
  }

  try {
    const parsed = JSON.parse(ref) as Partial<AdzunaCredentials>;
    if (parsed.appId?.trim() && parsed.appKey?.trim()) {
      return {
        appId: parsed.appId.trim(),
        appKey: parsed.appKey.trim(),
        country: normalizeAdzunaCountry(parsed.country ?? "us")
      };
    }
  } catch {
    const [appId, appKey, country] = ref.split("|");
    if (appId?.trim() && appKey?.trim()) {
      return {
        appId: appId.trim(),
        appKey: appKey.trim(),
        country: normalizeAdzunaCountry(country ?? "us")
      };
    }
  }

  return fromEnv();
}

export function adzunaCredentialSummary(ref: string | null | undefined) {
  const creds = parseAdzunaCredentials(ref);
  if (!creds) {
    return null;
  }
  return { appId: creds.appId, country: creds.country };
}

function adzunaApiBase() {
  return process.env.ADZUNA_API_BASE?.trim().replace(/\/+$/, "") || "https://api.adzuna.com/v1/api";
}

export function buildAdzunaSearchWhat(query: string) {
  const q = query.trim();
  return q || "developer";
}

export async function probeAdzunaCredentials(creds: AdzunaCredentials) {
  const response = await searchAdzunaJobs(creds, { what: "developer", page: 1, resultsPerPage: 1 });
  if (response.results.length === 0 && (response.totalCount ?? 0) === 0) {
    return {
      ok: false as const,
      message: "Adzuna credentials accepted but no jobs returned. Check country code (e.g. us, gb) or API quota."
    };
  }
  return { ok: true as const, sampleCount: response.results.length, totalCount: response.totalCount ?? 0 };
}

export async function searchAdzunaJobs(
  creds: AdzunaCredentials,
  input: { what: string; where?: string; page?: number; resultsPerPage?: number; maxPages?: number }
) {
  const country = normalizeAdzunaCountry(creds.country);
  const base = adzunaApiBase();
  const resultsPerPage = Math.min(Math.max(input.resultsPerPage ?? 50, 1), 50);
  const maxPages = Math.min(Math.max(input.maxPages ?? 3, 1), 10);
  const all: AdzunaJobResult[] = [];
  let totalCount: number | undefined;

  for (let page = input.page ?? 1; page < (input.page ?? 1) + maxPages; page += 1) {
    const params = new URLSearchParams({
      app_id: creds.appId,
      app_key: creds.appKey,
      results_per_page: String(resultsPerPage),
      what: input.what,
      "content-type": "application/json"
    });
    if (input.where?.trim()) {
      params.set("where", input.where.trim());
    }

    const url = `${base}/jobs/${encodeURIComponent(country)}/search/${page}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Adzuna API rejected your app ID or app key. Check credentials at developer.adzuna.com.");
    }
    if (!response.ok) {
      throw new Error(`Adzuna search failed (${response.status}). Check app ID, app key, and country.`);
    }

    const payload = (await response.json()) as AdzunaSearchResponse;
    totalCount = payload.count;
    const batch = payload.results ?? [];
    if (batch.length === 0) {
      break;
    }
    all.push(...batch);
    if (batch.length < resultsPerPage) {
      break;
    }
  }

  return { results: all, totalCount };
}

export function adzunaJobCompany(job: AdzunaJobResult) {
  return job.company?.display_name?.trim() || "Unknown employer";
}

export function adzunaJobLocation(job: AdzunaJobResult) {
  if (job.location?.display_name?.trim()) {
    return job.location.display_name.trim();
  }
  return job.location?.area?.slice(-1)[0] ?? "";
}

export function adzunaJobDomain(job: AdzunaJobResult) {
  return job.category?.label?.trim() || "General";
}

export function adzunaJobPostedAt(job: AdzunaJobResult) {
  if (job.created) {
    const parsed = new Date(job.created);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function adzunaJobDescription(job: AdzunaJobResult) {
  const parts = [job.description?.trim() || ""];
  if (typeof job.salary_min === "number" && typeof job.salary_max === "number") {
    parts.push(`Salary: $${Math.round(job.salary_min).toLocaleString()} – $${Math.round(job.salary_max).toLocaleString()}`);
  }
  if (job.redirect_url) {
    parts.push(`Apply: ${job.redirect_url}`);
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

export function inferSkillsFromAdzunaText(text: string): string[] {
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
    "Product",
    "Engineering"
  ];
  const lower = text.toLowerCase();
  return catalog.filter((skill) => lower.includes(skill.toLowerCase())).slice(0, 8);
}

export function scoreAdzunaJobMatch(job: AdzunaJobResult, query: string, keywords: string[] = []) {
  const haystack = `${job.title} ${job.description ?? ""} ${adzunaJobLocation(job)} ${adzunaJobCompany(job)}`.toLowerCase();
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

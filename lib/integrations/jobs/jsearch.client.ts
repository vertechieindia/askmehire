export interface JSearchCredentials {
  apiKey: string;
  country: string;
}

export interface JSearchJobResult {
  job_id: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_posted_at_datetime_utc?: string;
  job_posted_at_timestamp?: number;
  job_is_remote?: boolean;
  job_employment_type?: string;
  job_highlights?: { Qualifications?: string[]; Responsibilities?: string[] };
}

export interface JSearchSearchResponse {
  status?: string;
  data?: JSearchJobResult[];
}

const SUPPORTED_COUNTRIES = new Set(["us", "gb", "au", "ca", "de", "fr", "in", "nz", "sg", "za"]);

export function normalizeJSearchCountry(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidJSearchCountry(country: string) {
  return SUPPORTED_COUNTRIES.has(normalizeJSearchCountry(country));
}

export function isValidJSearchApiKey(apiKey: string) {
  return /^[a-z0-9]{20,128}$/i.test(apiKey.trim());
}

export function serializeJSearchCredentials(creds: JSearchCredentials) {
  return JSON.stringify({
    apiKey: creds.apiKey.trim(),
    country: normalizeJSearchCountry(creds.country || "us")
  });
}

export function parseJSearchCredentials(ref: string | null | undefined): JSearchCredentials | null {
  const fromEnv = (): JSearchCredentials | null => {
    const apiKey = process.env.JSEARCH_RAPIDAPI_KEY?.trim();
    if (!apiKey) {
      return null;
    }
    return {
      apiKey,
      country: normalizeJSearchCountry(process.env.JSEARCH_COUNTRY ?? "us")
    };
  };

  if (!ref?.trim()) {
    return fromEnv();
  }

  try {
    const parsed = JSON.parse(ref) as Partial<JSearchCredentials>;
    if (parsed.apiKey?.trim()) {
      return {
        apiKey: parsed.apiKey.trim(),
        country: normalizeJSearchCountry(parsed.country ?? "us")
      };
    }
  } catch {
    const apiKey = ref.trim();
    if (apiKey) {
      return fromEnv();
    }
  }

  return fromEnv();
}

export function getJSearchCredentialsFromEnv() {
  return parseJSearchCredentials(null);
}

function jsearchApiHost() {
  return process.env.JSEARCH_RAPIDAPI_HOST?.trim() || "jsearch.p.rapidapi.com";
}

function jsearchApiBase() {
  return process.env.JSEARCH_API_BASE?.trim().replace(/\/+$/, "") || "https://jsearch.p.rapidapi.com";
}

export function buildJSearchQuery(query: string) {
  const q = query.trim();
  return q || "software developer";
}

export async function probeJSearchCredentials(creds: JSearchCredentials) {
  const response = await searchJSearchJobs(creds, { query: "developer", page: 1, numPages: 1 });
  if (response.results.length === 0) {
    return {
      ok: false as const,
      message: "JSearch API accepted the key but returned no jobs. Check country code or RapidAPI quota."
    };
  }
  return { ok: true as const, sampleCount: response.results.length };
}

export async function searchJSearchJobs(
  creds: JSearchCredentials,
  input: { query: string; page?: number; numPages?: number; country?: string }
) {
  const base = jsearchApiBase();
  const host = jsearchApiHost();
  const country = normalizeJSearchCountry(input.country ?? creds.country);
  const page = Math.min(Math.max(input.page ?? 1, 1), 50);
  const numPages = Math.min(Math.max(input.numPages ?? Number(process.env.JSEARCH_SYNC_NUM_PAGES ?? 5), 1), 20);

  const params = new URLSearchParams({
    query: input.query,
    page: String(page),
    num_pages: String(numPages),
    country,
    language: "en"
  });

  const url = `${base}/search?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-rapidapi-key": creds.apiKey,
      "x-rapidapi-host": host
    },
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("JSearch API rejected your RapidAPI key. Check JSEARCH_RAPIDAPI_KEY in .env.");
  }
  if (response.status === 429) {
    throw new Error("JSearch API rate limit reached. Try again later or upgrade your RapidAPI plan.");
  }
  if (!response.ok) {
    throw new Error(`JSearch search failed (${response.status}). Check RapidAPI key and quota.`);
  }

  const payload = (await response.json()) as JSearchSearchResponse;
  return { results: payload.data ?? [] };
}

export function jsearchJobCompany(job: JSearchJobResult) {
  return job.employer_name?.trim() || "Unknown employer";
}

export function jsearchJobLocation(job: JSearchJobResult) {
  const parts = [job.job_city, job.job_state, job.job_country].map((part) => part?.trim()).filter(Boolean);
  if (job.job_is_remote) {
    parts.unshift("Remote");
  }
  return parts.join(", ");
}

export function jsearchJobDomain(job: JSearchJobResult) {
  return job.job_employment_type?.trim() || "General";
}

export function jsearchJobPostedAt(job: JSearchJobResult) {
  if (job.job_posted_at_datetime_utc) {
    const parsed = new Date(job.job_posted_at_datetime_utc);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  if (typeof job.job_posted_at_timestamp === "number" && job.job_posted_at_timestamp > 0) {
    return new Date(job.job_posted_at_timestamp * 1000).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function jsearchJobDescription(job: JSearchJobResult) {
  const parts = [job.job_description?.trim() || ""];
  const applyLink = job.job_apply_link?.trim() || job.job_google_link?.trim();
  if (applyLink) {
    parts.push(`Apply: ${applyLink}`);
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

export function inferSkillsFromJSearchText(text: string): string[] {
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

export function scoreJSearchJobMatch(job: JSearchJobResult, query: string, keywords: string[] = []) {
  const haystack = `${job.job_title ?? ""} ${job.job_description ?? ""} ${jsearchJobLocation(job)} ${jsearchJobCompany(job)}`.toLowerCase();
  const terms = [query, ...keywords].map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) {
    return 82;
  }
  let score = 52;
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += 12;
    }
  }
  return Math.min(100, score);
}

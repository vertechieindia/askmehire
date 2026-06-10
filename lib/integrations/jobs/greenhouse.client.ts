const GREENHOUSE_API_BASE = "https://boards-api.greenhouse.io/v1";

export interface GreenhouseBoard {
  name: string;
  content?: string;
}

export interface GreenhouseJobPost {
  id: number;
  internal_job_id: number | null;
  title: string;
  updated_at: string;
  absolute_url: string;
  location: { name: string };
  content?: string;
  departments?: { name: string }[];
  offices?: { name: string; location?: string }[];
}

export interface GreenhouseJobsResponse {
  jobs: GreenhouseJobPost[];
  meta?: { total?: number };
}

function stripHtml(html: string) {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBoardToken(raw: string) {
  return raw.trim().replace(/^\/+|\/+$/g, "");
}

export function isValidBoardToken(token: string) {
  return /^[a-zA-Z0-9_-]+$/.test(token) && token.length >= 2 && token.length <= 120;
}

export function getGreenhouseBoardTokenFromEnv() {
  const tokens = getGreenhouseBoardTokensFromEnv();
  return tokens[0] ?? null;
}

export function parseGreenhouseBoardTokens(raw: string | null | undefined) {
  if (!raw?.trim()) {
    return [];
  }
  const tokens = raw
    .split(/[,\n]+/)
    .flatMap((part) => part.split(/\s+/))
    .map(normalizeBoardToken)
    .filter(Boolean);
  return [...new Set(tokens.filter(isValidBoardToken))];
}

export function getGreenhouseBoardTokensFromEnv() {
  return parseGreenhouseBoardTokens(process.env.GREENHOUSE_BOARD_TOKEN ?? "");
}

export function serializeGreenhouseBoardTokens(tokens: string[]) {
  return [...new Set(tokens.map(normalizeBoardToken).filter(isValidBoardToken))].join(",");
}

export async function fetchGreenhouseBoard(boardToken: string): Promise<GreenhouseBoard> {
  const token = normalizeBoardToken(boardToken);
  const response = await fetch(`${GREENHOUSE_API_BASE}/boards/${encodeURIComponent(token)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Greenhouse board lookup failed (${response.status}). Check your board token.`);
  }
  return (await response.json()) as GreenhouseBoard;
}

export async function fetchGreenhouseJobs(boardToken: string): Promise<GreenhouseJobPost[]> {
  const token = normalizeBoardToken(boardToken);
  const url = `${GREENHOUSE_API_BASE}/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Greenhouse jobs fetch failed (${response.status}). Check your board token.`);
  }
  const data = (await response.json()) as GreenhouseJobsResponse;
  return data.jobs ?? [];
}

export function greenhouseJobToPlainDescription(job: GreenhouseJobPost) {
  const raw = job.content ?? job.title;
  return stripHtml(raw);
}

export function greenhouseJobDepartment(job: GreenhouseJobPost) {
  return job.departments?.[0]?.name ?? "General";
}

export function greenhouseJobPostedAt(job: GreenhouseJobPost) {
  return job.updated_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
}

/** Lightweight skill hints from title + description text. */
export function inferSkillsFromText(text: string): string[] {
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

export function scoreGreenhouseJobMatch(job: GreenhouseJobPost, query: string, keywords: string[] = []) {
  const haystack = `${job.title} ${greenhouseJobToPlainDescription(job)} ${job.location?.name ?? ""}`.toLowerCase();
  const terms = [query, ...keywords].map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) {
    return 85;
  }
  let score = 55;
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += 15;
    }
  }
  return Math.min(100, score);
}

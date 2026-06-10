export interface LeverPostingCategories {
  location?: string;
  commitment?: string;
  team?: string;
  department?: string;
  allLocations?: string[];
}

export interface LeverPosting {
  id: string;
  text: string;
  createdAt?: number;
  updatedAt?: number;
  categories?: LeverPostingCategories;
  descriptionPlain?: string;
  description?: string;
  openingPlain?: string;
  hostedUrl?: string;
  applyUrl?: string;
  workplaceType?: string;
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLeverSiteSlug(raw: string) {
  return raw.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
}

export function isValidLeverSiteSlug(slug: string) {
  return /^[a-z0-9_-]+$/.test(slug) && slug.length >= 2 && slug.length <= 120;
}

export function getLeverSiteSlugFromEnv() {
  const slugs = getLeverSiteSlugsFromEnv();
  return slugs[0] ?? null;
}

export function parseLeverSiteSlugs(raw: string | null | undefined) {
  if (!raw?.trim()) {
    return [];
  }
  const slugs = raw
    .split(/[,\n]+/)
    .flatMap((part) => part.split(/\s+/))
    .map(normalizeLeverSiteSlug)
    .filter(Boolean);
  return [...new Set(slugs.filter(isValidLeverSiteSlug))];
}

export function getLeverSiteSlugsFromEnv() {
  return parseLeverSiteSlugs(process.env.LEVER_SITE_SLUG ?? "");
}

export function serializeLeverSiteSlugs(slugs: string[]) {
  return [...new Set(slugs.map(normalizeLeverSiteSlug).filter(isValidLeverSiteSlug))].join(",");
}

function leverApiBase() {
  const base = process.env.LEVER_POSTINGS_API_BASE?.trim();
  if (base) {
    return base.replace(/\/+$/, "");
  }
  return "https://api.lever.co";
}

export async function probeLeverSite(siteSlug: string) {
  const postings = await fetchLeverPostings(siteSlug, { maxPages: 1 });
  if (postings.length === 0) {
    return {
      ok: false as const,
      message: `No public Lever postings found for "${normalizeLeverSiteSlug(siteSlug)}". Use the slug from jobs.lever.co/yourcompany (e.g. ramp), not the word "lever".`
    };
  }
  return { ok: true as const, sampleCount: postings.length };
}

export async function fetchLeverPostings(
  siteSlug: string,
  options?: { maxPages?: number }
): Promise<LeverPosting[]> {
  const site = normalizeLeverSiteSlug(siteSlug);
  const base = leverApiBase();
  const all: LeverPosting[] = [];
  const pageSize = 100;
  let skip = 0;

  const maxPages = options?.maxPages ?? 20;
  for (let page = 0; page < maxPages; page += 1) {
    const url = `${base}/v0/postings/${encodeURIComponent(site)}?mode=json&limit=${pageSize}&skip=${skip}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (response.status === 404) {
      throw new Error(`Lever site "${site}" not found or public Postings API disabled.`);
    }
    if (!response.ok) {
      throw new Error(`Lever postings fetch failed (${response.status}). Check your site slug.`);
    }
    const batch = (await response.json()) as LeverPosting[];
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    all.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    skip += batch.length;
  }

  return all;
}

export function leverPostingDescription(job: LeverPosting) {
  if (job.descriptionPlain?.trim()) {
    return job.descriptionPlain.trim();
  }
  if (job.openingPlain?.trim()) {
    return job.openingPlain.trim();
  }
  if (job.description?.trim()) {
    return stripHtml(job.description);
  }
  return job.text;
}

export function leverPostingLocation(job: LeverPosting) {
  return job.categories?.location ?? job.categories?.allLocations?.[0] ?? "";
}

export function leverPostingDepartment(job: LeverPosting) {
  return job.categories?.department ?? job.categories?.team ?? "General";
}

export function leverPostingPostedAt(job: LeverPosting) {
  const ts = job.createdAt ?? job.updatedAt;
  if (typeof ts === "number" && ts > 0) {
    return new Date(ts).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function inferSkillsFromLeverText(text: string): string[] {
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

export function scoreLeverPostingMatch(job: LeverPosting, query: string, keywords: string[] = []) {
  const haystack = `${job.text} ${leverPostingDescription(job)} ${leverPostingLocation(job)}`.toLowerCase();
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

import { createHash } from "node:crypto";
import type { NormalizedConnectorJob } from "@/lib/integrations/jobs/types";

type CatalogEntry = Omit<NormalizedConnectorJob, "source"> & { portal: NormalizedConnectorJob["source"] };

/** Connector feed samples — replace with live API/RSS responses per portal. */
export const CONNECTOR_JOB_CATALOG: CatalogEntry[] = [
  // Dice
  {
    portal: "Dice",
    externalId: "dice-react-senior-001",
    title: "Senior React Developer",
    company: "FinEdge Capital",
    location: "Remote",
    domain: "Financial Services",
    skills: ["React", "TypeScript", "Redux", "Jest", "C2C"],
    description: "Senior React Developer for trading dashboards, TypeScript, Redux Toolkit, and production UI support.",
    normalizedScore: 92,
    applyMode: "connector_ready",
    postedAt: "2026-06-01"
  },
  {
    portal: "Dice",
    externalId: "dice-react-fullstack-002",
    title: "React Full Stack Engineer",
    company: "NovaStack Labs",
    location: "Austin, TX",
    domain: "Technology",
    skills: ["React", "Node.js", "PostgreSQL", "AWS"],
    description: "React full stack role building customer portals and REST APIs.",
    normalizedScore: 88,
    applyMode: "connector_ready",
    postedAt: "2026-06-02"
  },
  {
    portal: "Dice",
    externalId: "dice-frontend-contract-003",
    title: "Frontend React Contractor",
    company: "Gridline Health",
    location: "Chicago, IL",
    domain: "Healthcare",
    skills: ["React", "Material UI", "Healthcare", "Contract"],
    description: "Contract React developer for HIPAA-aware patient scheduling UI.",
    normalizedScore: 85,
    applyMode: "human_assisted",
    postedAt: "2026-06-03"
  },
  // LinkedIn
  {
    portal: "LinkedIn",
    externalId: "li-react-lead-001",
    title: "Lead React Developer",
    company: "MarketLake Analytics",
    location: "Remote",
    domain: "Technology",
    skills: ["React", "Next.js", "GraphQL", "Leadership"],
    description: "Lead React engineer owning design system and Next.js migration.",
    normalizedScore: 94,
    applyMode: "human_assisted",
    postedAt: "2026-06-01"
  },
  {
    portal: "LinkedIn",
    externalId: "li-react-ui-002",
    title: "React UI Engineer",
    company: "BrightCart Commerce",
    location: "Seattle, WA",
    domain: "Retail",
    skills: ["React", "Tailwind", "Accessibility", "E-commerce"],
    description: "React UI engineer for checkout and catalog experiences.",
    normalizedScore: 89,
    applyMode: "human_assisted",
    postedAt: "2026-06-02"
  },
  {
    portal: "LinkedIn",
    externalId: "li-react-native-web-003",
    title: "React Developer (Web)",
    company: "PulsePay Systems",
    location: "New York, NY",
    domain: "Financial Services",
    skills: ["React", "TypeScript", "Payments", "C2C"],
    description: "React developer for payment operations dashboards and audit workflows.",
    normalizedScore: 87,
    applyMode: "human_assisted",
    postedAt: "2026-06-04"
  },
  // Monster
  {
    portal: "Monster",
    externalId: "monster-react-mid-001",
    title: "React Developer",
    company: "Summit Insurance Group",
    location: "Hartford, CT",
    domain: "Insurance",
    skills: ["React", "JavaScript", "REST", "Agile"],
    description: "Mid-level React developer for policy admin modernization.",
    normalizedScore: 86,
    applyMode: "connector_ready",
    postedAt: "2026-06-01"
  },
  {
    portal: "Monster",
    externalId: "monster-react-senior-002",
    title: "Senior React Engineer",
    company: "Atlas Logistics",
    location: "Atlanta, GA",
    domain: "Logistics",
    skills: ["React", "TypeScript", "Micro frontends"],
    description: "Senior React engineer for fleet tracking and warehouse UI modules.",
    normalizedScore: 90,
    applyMode: "connector_ready",
    postedAt: "2026-06-03"
  },
  {
    portal: "Monster",
    externalId: "monster-frontend-react-003",
    title: "Frontend Engineer (React)",
    company: "EduSpark Learning",
    location: "Remote",
    domain: "Education",
    skills: ["React", "Vite", "Testing Library"],
    description: "Frontend engineer building React learning platform features.",
    normalizedScore: 84,
    applyMode: "manual",
    postedAt: "2026-06-05"
  },
  // Indeed
  {
    portal: "Indeed",
    externalId: "indeed-react-dev-001",
    title: "React Developer",
    company: "CloudNest SaaS",
    location: "Remote",
    domain: "Technology",
    skills: ["React", "Hooks", "Context", "SaaS"],
    description: "React developer for multi-tenant SaaS admin console.",
    normalizedScore: 91,
    applyMode: "human_assisted",
    postedAt: "2026-06-02"
  },
  {
    portal: "Indeed",
    externalId: "indeed-react-ts-002",
    title: "React TypeScript Developer",
    company: "Riverbank Media",
    location: "Denver, CO",
    domain: "Media",
    skills: ["React", "TypeScript", "Storybook"],
    description: "React TypeScript developer for content publishing tools.",
    normalizedScore: 88,
    applyMode: "human_assisted",
    postedAt: "2026-06-03"
  },
  {
    portal: "Indeed",
    externalId: "indeed-react-contract-003",
    title: "Contract React Developer",
    company: "MetroGov Digital",
    location: "Washington, DC",
    domain: "Government",
    skills: ["React", "USWDS", "Accessibility", "Contract"],
    description: "Contract React role supporting public-facing digital services.",
    normalizedScore: 83,
    applyMode: "human_assisted",
    postedAt: "2026-06-04"
  }
];

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function matchesQuery(entry: CatalogEntry, query: string, keywords: string[] = []) {
  const haystack = normalizeToken(
    `${entry.title} ${entry.company} ${entry.location} ${entry.domain} ${entry.description} ${entry.skills.join(" ")}`
  );
  const terms = [query, ...keywords].map(normalizeToken).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  return terms.some((term) => haystack.includes(term));
}

export function filterConnectorCatalog(
  portal: CatalogEntry["portal"],
  query: string,
  keywords: string[] = []
): NormalizedConnectorJob[] {
  return CONNECTOR_JOB_CATALOG.filter((entry) => entry.portal === portal && matchesQuery(entry, query, keywords)).map(
    ({ portal: source, ...rest }) => ({
      source,
      ...rest
    })
  );
}

export function jdHashForJob(input: { source: string; externalId: string; description: string }) {
  return createHash("sha256").update(`${input.source}|${input.externalId}|${input.description}`).digest("hex").slice(0, 32);
}

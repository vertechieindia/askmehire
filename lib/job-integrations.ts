import type { ResumeGenerationResult } from "@/lib/types";

export type JobPortalName =
  | "Recruut"
  | "Dice"
  | "OPTnation"
  | "Techfetch"
  | "LinkedIn"
  | "Monster"
  | "Indeed"
  | "SimplyHired"
  | "ZipRecruiter"
  | "CareerBuilder";

export type ConnectorStatus = "not_connected" | "connected" | "needs_review" | "rate_limited";

export interface JobPortalConnector {
  name: JobPortalName;
  focus: string;
  authMode: "api_oauth" | "browser_session" | "rss_or_search" | "vendor_account";
  applyMode: "human_assisted" | "connector_prepare" | "api_submit_when_available";
  status: ConnectorStatus;
  refreshEverySeconds: number;
  setupAction: string;
  safetyControls: string[];
}

export interface CandidateApplicationProfile {
  userId: string;
  legalName: string;
  email: string;
  phone: string;
  linkedin: string;
  currentLocation: string;
  targetLocations: string[];
  jobTitles: string[];
  keywords: string[];
  blocklistedWords: string[];
  workAuthorization: "US Citizen" | "Green Card" | "H1B" | "OPT" | "CPT" | "EAD" | "Other";
  visaSponsorship: "required" | "not_required" | "open";
  employmentTypes: string[];
  expectedRate: string;
  availability: string;
  relocation: "yes" | "no" | "remote_only";
  primaryResumeId?: string;
  reusableAnswers: Record<string, string>;
  connectorStatuses: Record<JobPortalName, ConnectorStatus>;
  updatedAt: string;
}

export interface SyncedRole {
  id: string;
  portal: JobPortalName;
  title: string;
  company: string;
  location: string;
  contractType: string;
  recruiterName: string;
  recruiterEmail: string;
  link: string;
  jd: string;
  keywords: string[];
  matchScore: number;
  exclusionHits: string[];
  matchedSignals: string[];
  status: "new" | "saved" | "prepared" | "applied" | "excluded";
  discoveredAt: string;
  safeApplyMode: JobPortalConnector["applyMode"];
}

export interface AppliedRoleRecord {
  id: string;
  userId: string;
  portal: JobPortalName;
  companyName: string;
  title: string;
  jd: string;
  link: string;
  recruiterEmail: string;
  resumeId: string;
  resumeSnapshot: string;
  status: "prepared" | "applied" | "response_received" | "closed";
  response?: string;
  applicationPayload: Record<string, string>;
  createdAt: string;
}

export const JOB_PORTAL_CONNECTORS: JobPortalConnector[] = [
  {
    name: "Recruut",
    focus: "C2C, H1B, and technical contract roles",
    authMode: "vendor_account",
    applyMode: "connector_prepare",
    status: "not_connected",
    refreshEverySeconds: 60,
    setupAction: "Add Recruut vendor credentials or invite the connector account to the recruiter workspace.",
    safetyControls: ["dedicated connector session", "per-portal throttling", "human review before submit"]
  },
  {
    name: "Dice",
    focus: "Technology and engineering roles in the U.S.",
    authMode: "api_oauth",
    applyMode: "api_submit_when_available",
    status: "connected",
    refreshEverySeconds: 60,
    setupAction: "OAuth/API connector is enabled in demo mode; production needs Dice API credentials in the token vault.",
    safetyControls: ["API-first sync", "quota-aware polling", "candidate-specific search filters"]
  },
  {
    name: "OPTnation",
    focus: "C2C, OPT, and E-verified roles",
    authMode: "vendor_account",
    applyMode: "connector_prepare",
    status: "needs_review",
    refreshEverySeconds: 60,
    setupAction: "Review OPTnation account permissions and confirm the allowed C2C/OPT search and apply workflow.",
    safetyControls: ["session isolation", "resume reuse checks", "no aggressive auto-apply"]
  },
  {
    name: "Techfetch",
    focus: "U.S. IT jobs and C2C requirements",
    authMode: "vendor_account",
    applyMode: "connector_prepare",
    status: "connected",
    refreshEverySeconds: 60,
    setupAction: "Vendor connector is enabled in demo mode; production needs a dedicated Techfetch account session.",
    safetyControls: ["low-volume refresh", "blocklist filtering before display", "application payload audit"]
  },
  {
    name: "LinkedIn",
    focus: "C2C, contractor, and direct recruiter opportunities",
    authMode: "browser_session",
    applyMode: "human_assisted",
    status: "needs_review",
    refreshEverySeconds: 60,
    setupAction: "LinkedIn requires a user-approved browser session and human-assisted apply flow to protect account health.",
    safetyControls: ["no hidden background spam", "manual confirmation for apply", "account-health friendly pacing"]
  },
  {
    name: "Monster",
    focus: "Broad job board with contract, technology, and recruiter-posted roles",
    authMode: "api_oauth",
    applyMode: "api_submit_when_available",
    status: "not_connected",
    refreshEverySeconds: 60,
    setupAction: "Add Monster API/OAuth credentials or a dedicated approved connector account before production sync.",
    safetyControls: ["OAuth token vault", "candidate-specific searches", "human confirmation before sensitive submit"]
  },
  {
    name: "Indeed",
    focus: "Large job board with contract and C2C keyword searches",
    authMode: "rss_or_search",
    applyMode: "human_assisted",
    status: "connected",
    refreshEverySeconds: 60,
    setupAction: "Search/RSS-style connector is enabled in demo mode; production should attach the approved feed/search source.",
    safetyControls: ["search-result ingestion", "apply handoff", "duplicate JD hash checks"]
  },
  {
    name: "SimplyHired",
    focus: "Contract jobs across industries",
    authMode: "rss_or_search",
    applyMode: "human_assisted",
    status: "connected",
    refreshEverySeconds: 60,
    setupAction: "Search connector is enabled in demo mode; production should attach the approved source and redirect rules.",
    safetyControls: ["normalized listing capture", "safe redirect", "candidate confirmation"]
  },
  {
    name: "ZipRecruiter",
    focus: "Fast job matching and broad job coverage",
    authMode: "api_oauth",
    applyMode: "api_submit_when_available",
    status: "connected",
    refreshEverySeconds: 60,
    setupAction: "OAuth/API connector is enabled in demo mode; production needs ZipRecruiter API credentials.",
    safetyControls: ["API quota tracking", "dedupe by company/title/location", "resume fingerprint check"]
  },
  {
    name: "CareerBuilder",
    focus: "General job board with broad U.S. coverage",
    authMode: "api_oauth",
    applyMode: "api_submit_when_available",
    status: "not_connected",
    refreshEverySeconds: 60,
    setupAction: "Add CareerBuilder OAuth/API credentials before enabling production sync and submit actions.",
    safetyControls: ["OAuth token vault", "retry backoff", "candidate profile reuse"]
  }
];

export const DEFAULT_CANDIDATE_PROFILES: CandidateApplicationProfile[] = [
  {
    userId: "user-individual",
    legalName: "Alex Morgan",
    email: "alex.morgan@example.com",
    phone: "(555) 010-2048",
    linkedin: "linkedin.com/in/alexmorgan",
    currentLocation: "Charlotte, NC",
    targetLocations: ["Remote", "Charlotte, NC", "Dallas, TX", "New York, NY"],
    jobTitles: ["Senior Data Engineer", "AWS Data Engineer", "Big Data Engineer"],
    keywords: ["Spark", "Kafka", "AWS", "SQL", "C2C", "contract", "banking"],
    blocklistedWords: ["unpaid", "clearance required", "onsite only", "door to door"],
    workAuthorization: "H1B",
    visaSponsorship: "open",
    employmentTypes: ["C2C", "Contract", "Contract to hire"],
    expectedRate: "$75/hr",
    availability: "2 weeks",
    relocation: "remote_only",
    primaryResumeId: "resume-bank-data-v3",
    reusableAnswers: {
      "Work authorization": "H1B transfer/open to C2C contract engagement.",
      "Availability": "Available to start within 2 weeks.",
      "Expected rate": "$75/hr on C2C."
    },
    connectorStatuses: Object.fromEntries(JOB_PORTAL_CONNECTORS.map((connector) => [connector.name, connector.status])) as Record<JobPortalName, ConnectorStatus>,
    updatedAt: "2026-05-10"
  },
  {
    userId: "user-tenant-candidate-1",
    legalName: "Jordan Patel",
    email: "jordan.patel@northstarrecruiting.com",
    phone: "(555) 010-3110",
    linkedin: "linkedin.com/in/jordanpatel",
    currentLocation: "Remote",
    targetLocations: ["Remote", "Austin, TX", "Plano, TX"],
    jobTitles: ["Java Backend Engineer", "Spring Boot Developer"],
    keywords: ["Java", "Spring Boot", "Kafka", "AWS", "payments", "C2C"],
    blocklistedWords: ["junior", "unpaid", "clearance required"],
    workAuthorization: "H1B",
    visaSponsorship: "open",
    employmentTypes: ["C2C", "Contract"],
    expectedRate: "$70/hr",
    availability: "Immediate",
    relocation: "remote_only",
    primaryResumeId: "resume-java-payments-v2",
    reusableAnswers: {
      "Work authorization": "H1B candidate available for C2C contract roles.",
      "Availability": "Immediate.",
      "Expected rate": "$70/hr on C2C."
    },
    connectorStatuses: Object.fromEntries(JOB_PORTAL_CONNECTORS.map((connector) => [connector.name, connector.status])) as Record<JobPortalName, ConnectorStatus>,
    updatedAt: "2026-05-10"
  }
];

export const SEEDED_PORTAL_ROLES: Omit<SyncedRole, "id" | "matchScore" | "exclusionHits" | "matchedSignals" | "status" | "discoveredAt" | "safeApplyMode">[] = [
  {
    portal: "Dice",
    title: "Senior Data Engineer",
    company: "Northbridge Bank",
    location: "Charlotte, NC",
    contractType: "C2C Contract",
    recruiterName: "Rachel Kim",
    recruiterEmail: "rachel.kim@northbridge.example",
    link: "https://dice.example/jobs/northbridge-senior-data-engineer",
    jd: "Senior Data Engineer with Spark, Kafka, AWS, SQL, payment data, ledger reconciliation, banking controls, and data lineage.",
    keywords: ["Spark", "Kafka", "AWS", "SQL", "banking", "C2C", "contract"]
  },
  {
    portal: "Recruut",
    title: "AWS Data Engineer",
    company: "BlueLedger Financial",
    location: "Remote",
    contractType: "C2C",
    recruiterName: "Mina Shah",
    recruiterEmail: "mina.shah@blueledger.example",
    link: "https://recruut.example/jobs/aws-data-engineer-c2c",
    jd: "AWS Data Engineer for C2C banking engagement using Glue, S3, Spark, Airflow, PostgreSQL, and audit-ready data pipelines.",
    keywords: ["AWS", "Spark", "Airflow", "PostgreSQL", "banking", "C2C"]
  },
  {
    portal: "OPTnation",
    title: "Big Data Engineer",
    company: "OptiHealth Analytics",
    location: "Dallas, TX",
    contractType: "Contract",
    recruiterName: "Arun Mehta",
    recruiterEmail: "arun.mehta@optihealth.example",
    link: "https://optnation.example/jobs/big-data-engineer",
    jd: "Big Data Engineer with Spark, Kafka, SQL, healthcare claims feeds, HIPAA-aware processing, and production support.",
    keywords: ["Spark", "Kafka", "SQL", "healthcare", "contract"]
  },
  {
    portal: "Techfetch",
    title: "Java Backend Engineer",
    company: "Cedar Payments",
    location: "Remote",
    contractType: "C2C Contract",
    recruiterName: "Devon Lee",
    recruiterEmail: "devon.lee@cedarpayments.example",
    link: "https://techfetch.example/jobs/java-backend-engineer",
    jd: "Java Backend Engineer with Spring Boot, Kafka, REST APIs, PostgreSQL, AWS, payment workflows, and production issue triage.",
    keywords: ["Java", "Spring Boot", "Kafka", "AWS", "payments", "C2C"]
  },
  {
    portal: "LinkedIn",
    title: "Senior Data Engineer Contractor",
    company: "MarketLake Retail",
    location: "New York, NY",
    contractType: "Contractor",
    recruiterName: "Sam Rivera",
    recruiterEmail: "sam.rivera@marketlake.example",
    link: "https://linkedin.example/jobs/marketlake-data-engineer-contractor",
    jd: "Contractor role for Snowflake, Spark, SQL, inventory analytics, and retail order data marts. Onsite only.",
    keywords: ["Snowflake", "Spark", "SQL", "retail", "contractor", "onsite only"]
  },
  {
    portal: "Monster",
    title: "Senior AWS Data Engineer",
    company: "FinTrust Data Services",
    location: "Remote",
    contractType: "Contract",
    recruiterName: "Kelly Brooks",
    recruiterEmail: "kelly.brooks@fintrust.example",
    link: "https://monster.example/jobs/senior-aws-data-engineer",
    jd: "Senior AWS Data Engineer with Spark, Kafka, SQL, Airflow, financial reporting, data quality controls, and contract delivery experience.",
    keywords: ["AWS", "Spark", "Kafka", "SQL", "Airflow", "financial reporting", "contract"]
  },
  {
    portal: "Indeed",
    title: "Data Engineer",
    company: "CivicPath Systems",
    location: "Remote",
    contractType: "Contract to hire",
    recruiterName: "Pat Allen",
    recruiterEmail: "pat.allen@civicpath.example",
    link: "https://indeed.example/jobs/civicpath-data-engineer",
    jd: "Data Engineer with AWS, SQL, Airflow, public sector reporting, and dashboard-ready data feeds.",
    keywords: ["AWS", "SQL", "Airflow", "contract"]
  },
  {
    portal: "SimplyHired",
    title: "ETL Data Engineer",
    company: "Everwell Insurance",
    location: "Hartford, CT",
    contractType: "Contract",
    recruiterName: "Leslie Wong",
    recruiterEmail: "leslie.wong@everwell.example",
    link: "https://simplyhired.example/jobs/etl-data-engineer",
    jd: "ETL Data Engineer with SQL, claims reporting, provider extracts, and insurance data quality checks.",
    keywords: ["SQL", "claims", "insurance", "contract"]
  },
  {
    portal: "ZipRecruiter",
    title: "Spring Boot Developer",
    company: "PayNorth",
    location: "Plano, TX",
    contractType: "C2C",
    recruiterName: "Iris Chen",
    recruiterEmail: "iris.chen@paynorth.example",
    link: "https://ziprecruiter.example/jobs/spring-boot-developer",
    jd: "Spring Boot Developer with Java, Kafka, REST APIs, payment operations, AWS, and PostgreSQL audit logs.",
    keywords: ["Java", "Spring Boot", "Kafka", "AWS", "payments", "C2C"]
  },
  {
    portal: "CareerBuilder",
    title: "Senior Data Engineer",
    company: "AeroSupply Analytics",
    location: "Remote",
    contractType: "Contract",
    recruiterName: "Nora Fields",
    recruiterEmail: "nora.fields@aerosupply.example",
    link: "https://careerbuilder.example/jobs/senior-data-engineer",
    jd: "Senior Data Engineer using Spark, Kafka, AWS, SQL, supplier feeds, and supply chain planning data.",
    keywords: ["Spark", "Kafka", "AWS", "SQL", "supply chain", "contract"]
  }
];

function normalize(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function includesSignal(source: string, signal: string) {
  return normalize(source).includes(normalize(signal));
}

function scoreRole(profile: CandidateApplicationProfile, role: Omit<SyncedRole, "id" | "matchScore" | "exclusionHits" | "matchedSignals" | "status" | "discoveredAt" | "safeApplyMode">) {
  const source = `${role.title} ${role.location} ${role.contractType} ${role.jd} ${role.keywords.join(" ")}`;
  const matchedSignals: string[] = [];
  let score = 0;

  for (const title of profile.jobTitles) {
    if (includesSignal(source, title) || normalize(title).split(" ").some((token) => token.length > 3 && includesSignal(role.title, token))) {
      matchedSignals.push(`title:${title}`);
      score += 34;
      break;
    }
  }

  for (const location of profile.targetLocations) {
    if (includesSignal(source, location) || includesSignal(location, "Remote") && includesSignal(source, "Remote")) {
      matchedSignals.push(`location:${location}`);
      score += 22;
      break;
    }
  }

  const keywordMatches = profile.keywords.filter((keyword) => includesSignal(source, keyword));
  matchedSignals.push(...keywordMatches.slice(0, 8).map((keyword) => `keyword:${keyword}`));
  score += Math.min(34, keywordMatches.length * 7);

  const employmentMatches = profile.employmentTypes.filter((type) => includesSignal(source, type));
  matchedSignals.push(...employmentMatches.map((type) => `type:${type}`));
  score += Math.min(10, employmentMatches.length * 5);

  return { score: Math.min(100, score), matchedSignals };
}

export function buildDefaultProfileForUser(user: { id: string; name: string; email: string; title: string }): CandidateApplicationProfile {
  return {
    userId: user.id,
    legalName: user.name,
    email: user.email,
    phone: "",
    linkedin: "",
    currentLocation: "Remote",
    targetLocations: ["Remote"],
    jobTitles: [user.title || "Software Engineer"],
    keywords: ["contract", "C2C"],
    blocklistedWords: ["unpaid", "clearance required"],
    workAuthorization: "H1B",
    visaSponsorship: "open",
    employmentTypes: ["C2C", "Contract"],
    expectedRate: "",
    availability: "Immediate",
    relocation: "remote_only",
    primaryResumeId: "master-resume",
    reusableAnswers: {
      "Availability": "Immediate",
      "Expected rate": "",
      "Work authorization": "Available for contract roles."
    },
    connectorStatuses: Object.fromEntries(JOB_PORTAL_CONNECTORS.map((connector) => [connector.name, connector.status])) as Record<JobPortalName, ConnectorStatus>,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
}

export function syncJobsForCandidate(profile: CandidateApplicationProfile, existing: SyncedRole[], cycle: number) {
  const discoveredAt = new Date().toISOString();
  const safeApplyByPortal = Object.fromEntries(JOB_PORTAL_CONNECTORS.map((connector) => [connector.name, connector.applyMode])) as Record<JobPortalName, JobPortalConnector["applyMode"]>;
  const existingIds = new Set(existing.map((role) => role.id));
  const offset = cycle % SEEDED_PORTAL_ROLES.length;
  const rotated = [...SEEDED_PORTAL_ROLES.slice(offset), ...SEEDED_PORTAL_ROLES.slice(0, offset)];

  const refreshed = rotated.map((role, index): SyncedRole => {
    const { score, matchedSignals } = scoreRole(profile, role);
    const source = `${role.title} ${role.company} ${role.location} ${role.contractType} ${role.jd} ${role.keywords.join(" ")}`;
    const exclusionHits = profile.blocklistedWords.filter((word) => includesSignal(source, word));
    const id = `${profile.userId}-${role.portal}-${normalize(role.company)}-${normalize(role.title)}`.replace(/\s+/g, "-");
    const oldStatus = existing.find((item) => item.id === id)?.status;
    return {
      ...role,
      id,
      matchScore: exclusionHits.length ? 0 : Math.max(0, score - index),
      exclusionHits,
      matchedSignals,
      status: exclusionHits.length ? "excluded" : oldStatus || "new",
      discoveredAt,
      safeApplyMode: safeApplyByPortal[role.portal]
    };
  });

  const merged = [...existing.filter((role) => !existingIds.has(role.id) || role.status === "applied"), ...refreshed];
  const unique = new Map<string, SyncedRole>();
  for (const role of merged) {
    unique.set(role.id, role);
  }
  return Array.from(unique.values()).sort((a, b) => b.matchScore - a.matchScore);
}

export function createAppliedRoleRecord(params: {
  userId: string;
  role: SyncedRole;
  profile: CandidateApplicationProfile;
  resume?: ResumeGenerationResult | null;
}) {
  const { userId, role, profile, resume } = params;
  const resumeSnapshot = resume?.resumeMarkdown || `Resume placeholder for ${profile.legalName} using ${profile.primaryResumeId || "master-resume"}.`;

  return {
    id: `applied-${Date.now()}`,
    userId,
    portal: role.portal,
    companyName: role.company,
    title: role.title,
    jd: role.jd,
    link: role.link,
    recruiterEmail: role.recruiterEmail,
    resumeId: resume?.id || profile.primaryResumeId || "master-resume",
    resumeSnapshot,
    status: "prepared",
    applicationPayload: {
      legalName: profile.legalName,
      email: profile.email,
      phone: profile.phone,
      linkedin: profile.linkedin,
      workAuthorization: profile.workAuthorization,
      expectedRate: profile.expectedRate,
      availability: profile.availability,
      currentLocation: profile.currentLocation,
      relocation: profile.relocation
    },
    createdAt: new Date().toISOString()
  } satisfies AppliedRoleRecord;
}

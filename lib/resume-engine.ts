import {
  DOMAIN_PROFILES,
  INTELLIGENCE_COMPONENTS,
  ROLE_CATALOG,
  SKILL_TAXONOMY,
  SUPPORTED_DOMAINS,
  TECHNOLOGY_TIMELINES
} from "@/lib/catalog";
import type {
  DomainName,
  ResumeComponent,
  ResumeGenerationRequest,
  ResumeGenerationResult,
  ResumeScoreSet,
  RoleName
} from "@/lib/types";

const STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "to",
  "of",
  "in",
  "for",
  "with",
  "on",
  "by",
  "is",
  "are",
  "as",
  "be",
  "this",
  "that",
  "will",
  "from",
  "you",
  "we",
  "our",
  "your",
  "they",
  "their",
  "at",
  "it",
  "have",
  "has",
  "must",
  "should"
]);

const BUZZWORDS = [
  "cutting edge",
  "world class",
  "synergy",
  "rockstar",
  "ninja",
  "game changer",
  "visionary",
  "best in class",
  "dynamic",
  "innovative"
];

const SECTION_SKILL_GROUPS = {
  "Languages": ["Java", "Python", "TypeScript", "SQL"],
  "Backend": ["Spring Boot", "Node.js", "REST APIs", "FastAPI"],
  "Data": ["Apache Spark", "Apache Kafka", "Snowflake", "Airflow"],
  "Cloud and DevOps": ["AWS", "Azure", "Docker", "Kubernetes", "Terraform"],
  "Testing and Quality": ["Selenium", "Playwright", "Cypress", "REST Assured"],
  "Governance": ["Data Lineage", "Audit Logging", "RBAC", "PII Controls"]
};

function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string) {
  return normalize(input)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countPhrase(text: string, phrase: string) {
  const source = normalize(text);
  const target = normalize(phrase);
  if (!target) {
    return 0;
  }
  return source.includes(target) ? 1 : 0;
}

function containsAlias(text: string, alias: string) {
  const source = normalize(text);
  const target = normalize(alias);
  if (!target) {
    return false;
  }
  if (target.length <= 2) {
    return new RegExp(`(^|\\s)${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(source);
  }
  return source.includes(target);
}

function tokenOverlap(source: string, target: string) {
  const sourceTokens = new Set(tokenize(source));
  const targetTokens = unique(tokenize(target));
  if (targetTokens.length === 0) {
    return 0;
  }
  const hits = targetTokens.filter((token) => sourceTokens.has(token)).length;
  return hits / targetTokens.length;
}

export function canonicalizeJD(jobDescription: string) {
  const seen = new Set<string>();
  const boilerplatePatterns = [
    /equal opportunity employer/i,
    /reasonable accommodation/i,
    /must be authorized to work/i,
    /background check/i,
    /eeo/i
  ];

  return jobDescription
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !boilerplatePatterns.some((pattern) => pattern.test(line)))
    .filter((line) => {
      const key = normalize(line);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .join("\n");
}

export function extractSkills(text: string) {
  const normalized = normalize(text);
  const skills: string[] = [];

  for (const [canonical, aliases] of Object.entries(SKILL_TAXONOMY)) {
    if (aliases.some((alias) => containsAlias(normalized, alias))) {
      skills.push(canonical);
    }
  }

  for (const timeline of TECHNOLOGY_TIMELINES) {
    if (timeline.aliases.some((alias) => containsAlias(normalized, alias))) {
      skills.push(timeline.name);
    }
  }

  if (/\bsql\b/i.test(text)) {
    skills.push("SQL");
  }
  if (/rest|api|microservice/i.test(text)) {
    skills.push("REST APIs");
  }
  if (/lineage|governance|audit/i.test(text)) {
    skills.push("Data Lineage");
  }

  return unique(skills).slice(0, 18);
}

export function detectDomain(text: string): DomainName {
  const normalized = normalize(text);
  let bestDomain = "Technology";
  let bestScore = 0;

  for (const profile of DOMAIN_PROFILES) {
    const signals = [
      profile.name,
      ...profile.prioritySignals,
      ...profile.dataTypes,
      ...profile.systems,
      ...profile.compliance
    ];
    const score = signals.reduce((total, signal) => total + countPhrase(normalized, signal), 0);
    if (score > bestScore) {
      bestScore = score;
      bestDomain = profile.name;
    }
  }

  for (const domain of SUPPORTED_DOMAINS) {
    if (normalized.includes(normalize(domain)) && bestScore < 2) {
      bestDomain = domain;
      bestScore = 2;
    }
  }

  return bestDomain;
}

function roleScore(role: string, text: string) {
  const normalizedRole = normalize(role);
  const normalizedText = normalize(text);
  let score = tokenOverlap(normalizedText, normalizedRole) * 5;

  if (normalizedText.includes(normalizedRole)) {
    score += 6;
  }

  const roleFamilies: Array<[RegExp, string[]]> = [
    [/data|etl|warehouse|analytics|spark|kafka|snowflake/i, ["Data Engineer", "Big Data Engineer", "Analytics Engineer"]],
    [/java|spring|microservice|backend/i, ["Java Backend Engineer", "Java Developer", "Spring Boot Developer"]],
    [/react|frontend|ui|typescript/i, ["React Developer", "Frontend Engineer", "UI Engineer"]],
    [/aws|cloud|terraform|kubernetes|devops/i, ["AWS Cloud Engineer", "DevOps Engineer", "Platform Engineer"]],
    [/selenium|playwright|qa|sdet|automation test/i, ["SDET", "Automation Test Engineer", "Selenium Automation Engineer"]],
    [/salesforce|apex|lightning/i, ["Salesforce Developer", "Salesforce Consultant"]]
  ];

  for (const [pattern, roles] of roleFamilies) {
    if (pattern.test(text) && roles.includes(role)) {
      score += 5;
    }
  }

  return score;
}

export function detectRole(jobDescription: string, targetTitle?: string): RoleName {
  if (targetTitle) {
    const direct = ROLE_CATALOG.find((role) => normalize(role) === normalize(targetTitle));
    if (direct) {
      return direct;
    }
  }

  const combined = `${targetTitle ?? ""}\n${jobDescription}`;
  return ROLE_CATALOG.reduce(
    (best, role) => {
      const score = roleScore(role, combined);
      return score > best.score ? { role, score } : best;
    },
    { role: targetTitle || "Data Engineer", score: 0 }
  ).role;
}

function roleFamily(role: string) {
  const normalizedRole = normalize(role);
  if (normalizedRole.includes("data") || normalizedRole.includes("analytics") || normalizedRole.includes("big data")) {
    return "data";
  }
  if (normalizedRole.includes("java") || normalizedRole.includes("spring") || normalizedRole.includes("backend")) {
    return "backend";
  }
  if (normalizedRole.includes("frontend") || normalizedRole.includes("react") || normalizedRole.includes("ui")) {
    return "frontend";
  }
  if (normalizedRole.includes("cloud") || normalizedRole.includes("devops") || normalizedRole.includes("platform")) {
    return "cloud";
  }
  if (normalizedRole.includes("qa") || normalizedRole.includes("sdet") || normalizedRole.includes("test")) {
    return "testing";
  }
  if (normalizedRole.includes("salesforce")) {
    return "crm";
  }
  return "general";
}

function rankComponents(role: RoleName, domain: DomainName, skills: string[], jd: string) {
  const skillSet = new Set(skills.map(normalize));
  const compatibleComponents = INTELLIGENCE_COMPONENTS.filter(
    (component) => {
      if (!["approved", "published"].includes(component.status)) {
        return false;
      }
      if (component.domain !== domain && component.domain !== "Technology") {
        return false;
      }
      if (component.componentType === "achievement" && component.domain === domain) {
        return true;
      }
      return roleFamily(component.role) === roleFamily(role) || skillSet.has(normalize(component.technology));
    }
  );

  const ranked = compatibleComponents
    .map((component) => {
      let score = component.qualityScore / 20 + component.freshnessScore / 25 - component.deprecationScore / 20;
      if (component.role === role) {
        score += 8;
      } else if (roleFamily(component.role) === roleFamily(role)) {
        score += 4;
      }
      if (component.domain === domain) {
        score += 7;
      }
      if (skillSet.has(normalize(component.technology))) {
        score += 5;
      }
      score += component.tags.reduce((total, tag) => total + tokenOverlap(jd, tag) * 2, 0);
      score += tokenOverlap(jd, `${component.baseLogic} ${component.intent}`) * 5;
      return { component, score };
    })
    .sort((a, b) => b.score - a.score);

  const strongMatches = ranked.filter((item) => item.score > 8).slice(0, 8).map((item) => item.component);
  if (strongMatches.length >= 4) {
    return strongMatches;
  }

  return ranked.slice(0, 8).map((item) => item.component);
}

function findTimelineWarnings(text: string, skills: string[]) {
  const warnings: string[] = [];
  const lines = text.split(/\n|\.|;/).filter(Boolean);
  const skillLookup = new Set(skills.map(normalize));

  for (const line of lines) {
    const years = Array.from(line.matchAll(/\b(19|20)\d{2}\b/g))
      .map((match) => Number(match[0]))
      .filter((year) => year >= 1990 && year <= 2035);
    if (years.length === 0) {
      continue;
    }
    for (const tech of TECHNOLOGY_TIMELINES) {
      const mentioned = tech.aliases.some((alias) => containsAlias(line, alias));
      if (!mentioned) {
        continue;
      }
      for (const year of years) {
        if (year < tech.validFrom) {
          warnings.push(`${tech.name} appears near ${year}, but ${tech.maturityNote}`);
        }
        if (year > tech.validTo) {
          warnings.push(`${tech.name} appears after its recommended use window ending ${tech.validTo}.`);
        }
      }
    }
  }

  for (const skill of skills) {
    const timeline = TECHNOLOGY_TIMELINES.find((item) => normalize(item.name) === normalize(skill));
    if (timeline && timeline.validFrom >= 2022) {
      warnings.push(`Use ${timeline.name} only in recent roles from ${timeline.validFrom} onward.`);
    }
  }

  return unique(warnings).slice(0, 8);
}

function buildSummary(role: RoleName, domain: DomainName, skills: string[], selected: ResumeComponent[], strategy: string) {
  const domainProfile = DOMAIN_PROFILES.find((profile) => profile.name === domain);
  const dataContext = domainProfile?.dataTypes.slice(0, 3).join(", ") || "business records, events, and operational data";
  const systems = domainProfile?.systems.slice(0, 2).join(" and ") || "platform services and reporting workflows";
  const primarySkills = skills.slice(0, 8);
  const componentIntents = selected.slice(0, 4).map((component) => component.intent);

  const bullets = [
    `${role} with practical experience aligning ${domain.toLowerCase()} systems, ${dataContext}, and recruiter-readable technical delivery.`,
    `Matched JD requirements across ${primarySkills.slice(0, 4).join(", ") || "core engineering tools"} without forcing unrelated keywords into older experience.`,
    `Worked across ${systems} with attention to auditability, support handoffs, and production issue visibility.`,
    `Applied reusable resume intelligence for ${componentIntents.join(", ") || "domain-specific engineering work"} while keeping phrasing distinct.`,
    `Balanced ATS coverage with natural language so responsibilities read like real project work instead of generated keyword blocks.`,
    `Validated technology timelines before assigning tools to older roles, reducing the risk of unrealistic cloud or AI claims.`,
    `Separated summary, skills, responsibilities, achievements, and environments so each section can be patched without full regeneration.`,
    `Used ${strategy.toLowerCase()} positioning to emphasize the most relevant evidence for the target job description.`,
    `Preserved believable career flow by mapping each selected bullet to domain systems, datasets, and implementation context.`,
    `Flagged skill gaps and risky claims for review before export, giving admins and candidates a controlled approval path.`
  ];

  return bullets;
}

function buildSkillMatrix(skills: string[]) {
  const all = unique(skills);
  return Object.entries(SECTION_SKILL_GROUPS)
    .map(([label, defaults]) => {
      const selected = unique([
        ...all.filter((skill) => defaults.some((item) => normalize(item) === normalize(skill))),
        ...defaults.filter((skill) => all.some((item) => normalize(item) === normalize(skill)))
      ]).slice(0, 6);
      return selected.length ? `**${label}:** ${selected.join(", ")}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

function variationFor(component: ResumeComponent, index: number) {
  return component.variations[index % component.variations.length] || component.baseLogic;
}

function buildBusinessProblem(domain: DomainName, selected: ResumeComponent[]) {
  const profile = DOMAIN_PROFILES.find((item) => item.name === domain);
  const systems = profile?.systems.slice(0, 2).join(" and ") || "business platforms";
  const data = profile?.dataTypes.slice(0, 3).join(", ") || "operational data";
  const intents = selected.slice(0, 3).map((component) => component.intent).join(", ");
  return `The target role centers on ${systems}, where teams need reliable handling of ${data}. The generated draft prioritizes ${intents || "validated delivery work"} because those themes map directly to the JD and approved repository content.`;
}

function buildAchievements(domain: DomainName, selected: ResumeComponent[]) {
  const achievement = selected.find((component) => component.componentType === "achievement") || selected[0];
  const profile = DOMAIN_PROFILES.find((item) => item.name === domain);
  const compliance = profile?.compliance[0] || "audit";
  return [
    achievement
      ? variationFor(achievement, 1)
      : "Improved release review quality by clarifying ownership, validation points, and handoff notes across production workflows.",
    `Reduced review risk by connecting technical claims to ${domain.toLowerCase()} workflows, ${compliance} expectations, and source resume evidence.`,
    "Raised reuse efficiency by selecting approved components first, then patching only the JD-specific wording that needed customization."
  ];
}

function assembleResume(request: ResumeGenerationRequest, role: RoleName, domain: DomainName, skills: string[], selected: ResumeComponent[], warnings: string[]) {
  const summary = buildSummary(role, domain, skills, selected, request.strategy);
  const skillMatrix = buildSkillMatrix(skills);
  const responsibilities = selected
    .filter((component) => component.componentType === "responsibility" || component.componentType === "environment")
    .slice(0, 8)
    .map((component, index) => `- ${variationFor(component, index)}`);
  const achievements = buildAchievements(domain, selected).map((item) => `- ${item}`);
  const environments = unique(selected.map((component) => component.technology).concat(skills)).slice(0, 14);

  return [
    `${request.fullName || "Candidate Name"}`,
    `${request.targetTitle || role}`,
    `${request.email || "email@example.com"} | ${request.phone || "phone"} | ${request.linkedin || "LinkedIn"}`,
    "",
    "PROFESSIONAL SUMMARY",
    ...summary.map((bullet) => `- ${bullet}`),
    "",
    "SKILL MATRIX",
    skillMatrix,
    "",
    "PROFESSIONAL EXPERIENCE",
    `${domain} Resume Alignment | ${role} | Timeline from source resume`,
    "",
    "A) BUSINESS PROBLEM AND PROJECT DESCRIPTION",
    buildBusinessProblem(domain, selected),
    "",
    "B) KEY CONTRIBUTIONS",
    "- Retrieved approved resume intelligence using role, technology, domain, timeline, and intent metadata before drafting new wording.",
    "- Patched only relevant summary, skills, responsibility, achievement, and environment sections to reduce token cost and duplication.",
    "- Applied timeline and domain validators before export so modern tools were not assigned to unrealistic historical project periods.",
    "",
    "C) ROLES AND RESPONSIBILITIES",
    ...(responsibilities.length ? responsibilities : ["- Reviewed source resume evidence against JD requirements and prepared rewrite targets for admin approval."]),
    "",
    "D) KEY ACHIEVEMENTS",
    ...achievements,
    "",
    "E) ENVIRONMENT",
    environments.join(", "),
    "",
    "VALIDATION NOTES",
    ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["- No timeline or domain conflicts were detected in the current draft."])
  ].join("\n");
}

function scoreAts(jd: string, resume: string, skills: string[]) {
  const jdTokens = unique(tokenize(jd)).filter((token) => token.length > 3);
  const resumeTokens = new Set(tokenize(resume));
  const keywordCoverage = jdTokens.length ? jdTokens.filter((token) => resumeTokens.has(token)).length / jdTokens.length : 0.6;
  const skillCoverage = skills.length ? skills.filter((skill) => resume.toLowerCase().includes(skill.toLowerCase())).length / skills.length : 0.7;
  return clamp(keywordCoverage * 55 + skillCoverage * 35 + 8);
}

function scoreHumanRealism(resume: string) {
  const bullets = resume.split("\n").filter((line) => line.trim().startsWith("-"));
  const openings = bullets.map((line) => normalize(line).split(" ")[0]).filter(Boolean);
  const repeatedOpenings = openings.length - new Set(openings).size;
  const buzzwordHits = BUZZWORDS.reduce((total, buzzword) => total + countPhrase(resume, buzzword), 0);
  const metricMatches = resume.match(/\b\d+(\.\d+)?%|\b\d+x\b/gi)?.length ?? 0;
  const sentenceBalance = bullets.filter((line) => line.split(" ").length >= 9 && line.split(" ").length <= 28).length / Math.max(1, bullets.length);
  return clamp(88 + sentenceBalance * 10 - repeatedOpenings * 3 - buzzwordHits * 8 - Math.max(0, metricMatches - 4) * 3);
}

function scoreDomainAuthenticity(domain: DomainName, resume: string) {
  const profile = DOMAIN_PROFILES.find((item) => item.name === domain);
  if (!profile) {
    return 78;
  }
  const signals = [...profile.dataTypes, ...profile.systems, ...profile.compliance, ...profile.prioritySignals];
  const hits = signals.reduce((total, signal) => total + countPhrase(resume, signal), 0);
  return clamp(62 + Math.min(30, hits * 5));
}

function scoreUniqueness(resume: string) {
  const bullets = resume.split("\n").filter((line) => line.trim().startsWith("-"));
  if (bullets.length < 2) {
    return 80;
  }
  let collisions = 0;
  for (let index = 0; index < bullets.length; index += 1) {
    for (let next = index + 1; next < bullets.length; next += 1) {
      if (tokenOverlap(bullets[index], bullets[next]) > 0.62) {
        collisions += 1;
      }
    }
  }
  return clamp(96 - collisions * 8);
}

function scoreSkillGapClosure(skills: string[], resume: string) {
  if (!skills.length) {
    return 75;
  }
  const covered = skills.filter((skill) => normalize(resume).includes(normalize(skill))).length;
  return clamp((covered / skills.length) * 100);
}

function buildScores(jd: string, resume: string, domain: DomainName, skills: string[], warnings: string[]): ResumeScoreSet {
  return {
    ats: scoreAts(jd, resume, skills),
    humanRealism: scoreHumanRealism(resume),
    domainAuthenticity: scoreDomainAuthenticity(domain, resume),
    timelineIntegrity: clamp(96 - warnings.length * 8),
    uniqueness: scoreUniqueness(resume),
    skillGapClosure: scoreSkillGapClosure(skills, resume)
  };
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function buildExplainability(role: RoleName, domain: DomainName, skills: string[], selected: ResumeComponent[]) {
  const explanations = [
    `Role classifier selected ${role} from the target title and JD skill language.`,
    `Domain mapper selected ${domain} using industry systems, data types, compliance terms, and job vocabulary.`,
    `Skill taxonomy normalized aliases into ${skills.slice(0, 8).join(", ") || "core engineering skills"}.`,
    `Retrieval chose ${selected.length} approved reusable components before generating fresh wording.`,
    "Timeline validation checked modern tools against source years and component validity windows.",
    "Scoring engines evaluated ATS coverage, human realism, domain authenticity, uniqueness, and skill gap closure."
  ];

  selected.slice(0, 5).forEach((component) => {
    explanations.push(`Selected ${component.id} because it matched ${component.role}, ${component.domain}, ${component.technology}, and intent "${component.intent}".`);
  });

  return explanations;
}

function detectSkillGaps(jdSkills: string[], resumeText: string) {
  const normalizedResume = normalize(resumeText);
  return jdSkills.filter((skill) => !normalizedResume.includes(normalize(skill))).slice(0, 8);
}

export function generateResume(request: ResumeGenerationRequest): ResumeGenerationResult {
  const canonicalJD = canonicalizeJD(request.jobDescription);
  const detectedSkills = extractSkills(`${canonicalJD}\n${request.targetTitle}`);
  const role = detectRole(canonicalJD, request.targetTitle);
  const domain = detectDomain(canonicalJD);
  const selectedComponents = rankComponents(role, domain, detectedSkills, canonicalJD);
  const timelineChecks = findTimelineWarnings(`${request.resumeText}\n${canonicalJD}`, detectedSkills);
  const warnings = [...timelineChecks];
  const resumeMarkdown = assembleResume(request, role, domain, detectedSkills, selectedComponents, warnings);
  const scores = buildScores(canonicalJD, resumeMarkdown, domain, detectedSkills, warnings);
  const baselineTokenEstimate = estimateTokens(`${request.resumeText}\n${request.jobDescription}`) * 2;
  const optimizedTokenEstimate = estimateTokens(canonicalJD) + estimateTokens(selectedComponents.map((component) => component.baseLogic).join(" ")) + 650;
  const estimatedSavingsPercent = clamp(100 - (optimizedTokenEstimate / Math.max(1, baselineTokenEstimate)) * 100);

  return {
    id: `resume-${Date.now()}`,
    role,
    domain,
    detectedSkills,
    canonicalJD,
    resumeMarkdown,
    scores,
    selectedComponents,
    warnings,
    explainability: buildExplainability(role, domain, detectedSkills, selectedComponents),
    costGovernance: {
      route: detectedSkills.length > 8 ? "complex-generation" : "patch-and-review",
      baselineTokenEstimate,
      optimizedTokenEstimate,
      estimatedSavingsPercent,
      reuseRatio: clamp((selectedComponents.length / Math.max(8, selectedComponents.length + 2)) * 100)
    },
    skillGaps: detectSkillGaps(detectedSkills, request.resumeText),
    timelineChecks
  };
}

export function reviewComponentDraft(draft: Pick<ResumeComponent, "role" | "technology" | "domain" | "timelineStart" | "timelineEnd" | "intent" | "baseLogic">) {
  const exactDuplicate = INTELLIGENCE_COMPONENTS.find((component) => normalize(component.baseLogic) === normalize(draft.baseLogic));
  const semanticMatch = INTELLIGENCE_COMPONENTS.map((component) => ({
    component,
    score: tokenOverlap(component.baseLogic, draft.baseLogic)
  })).sort((a, b) => b.score - a.score)[0];

  const intentCollision = INTELLIGENCE_COMPONENTS.find(
    (component) =>
      component.role === draft.role &&
      component.technology === draft.technology &&
      component.domain === draft.domain &&
      normalize(component.intent) === normalize(draft.intent)
  );

  const timeline = TECHNOLOGY_TIMELINES.find((item) => normalize(item.name) === normalize(draft.technology));
  const timelineWarnings: string[] = [];
  if (timeline && draft.timelineStart < timeline.validFrom) {
    timelineWarnings.push(`${draft.technology} is not timeline-valid before ${timeline.validFrom}.`);
  }
  if (timeline && draft.timelineEnd > timeline.validTo) {
    timelineWarnings.push(`${draft.technology} should be retired after ${timeline.validTo}.`);
  }

  const warnings = [
    ...(exactDuplicate ? [`Exact duplicate found: ${exactDuplicate.id}`] : []),
    ...(semanticMatch && semanticMatch.score > 0.85 ? [`Semantic similarity warning: ${semanticMatch.component.id} scored ${Math.round(semanticMatch.score * 100)}%.`] : []),
    ...(intentCollision ? [`Intent collision found under role, technology, domain, and intent: ${intentCollision.id}`] : []),
    ...timelineWarnings
  ];

  return {
    decision: warnings.length ? "review_required" : "ready_for_admin_review",
    warnings,
    similarity: semanticMatch ? Math.round(semanticMatch.score * 100) : 0,
    closestComponentId: semanticMatch?.component.id ?? null
  };
}

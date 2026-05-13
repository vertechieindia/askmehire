export type RoleName = string;
export type DomainName = string;

export type ComponentStatus =
  | "draft"
  | "similarity_scan"
  | "review"
  | "approved"
  | "published"
  | "rejected"
  | "retired";

export type ComponentType =
  | "responsibility"
  | "business_problem"
  | "achievement"
  | "environment"
  | "summary"
  | "skill_mapping";

export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Recruiter Viewed"
  | "Interview Scheduled"
  | "Rejected"
  | "Offer"
  | "Closed";

export interface TechnologyTimeline {
  name: string;
  validFrom: number;
  validTo: number;
  aliases: string[];
  category: string;
  maturityNote: string;
}

export interface DomainProfile {
  name: DomainName;
  dataTypes: string[];
  systems: string[];
  compliance: string[];
  prioritySignals: string[];
  generationRules: string[];
}

export interface ResumeComponent {
  id: string;
  role: RoleName;
  technology: string;
  domain: DomainName;
  timelineStart: number;
  timelineEnd: number;
  componentType: ComponentType;
  intent: string;
  baseLogic: string;
  variations: string[];
  qualityScore: number;
  usageCount: number;
  freshnessScore: number;
  deprecationScore: number;
  status: ComponentStatus;
  tags: string[];
  approvedBy?: string;
}

export interface JobListing {
  id: string;
  source: "LinkedIn" | "Dice" | "Monster" | "ZipRecruiter" | "Glassdoor" | "Prime Vendor" | "Internal";
  title: string;
  company: string;
  location: string;
  domain: DomainName;
  skills: string[];
  normalizedScore: number;
  postedAt: string;
  applyMode: "human_assisted" | "connector_ready" | "manual";
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  userId: string;
  resumeId: string;
  status: ApplicationStatus;
  atsScore: number;
  realismScore: number;
  appliedAt: string;
  artifacts: {
    resumeDocx: string;
    jdSnapshot: string;
    coverLetter: string;
  };
}

export interface PromptVersion {
  id: string;
  name: string;
  modelRoute: string;
  status: "active" | "testing" | "retired";
  averageAtsScore: number;
  averageRealismScore: number;
  callbackRate: number;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

export interface ResumeScoreSet {
  ats: number;
  humanRealism: number;
  domainAuthenticity: number;
  timelineIntegrity: number;
  uniqueness: number;
  skillGapClosure: number;
}

export interface ResumeGenerationRequest {
  fullName: string;
  targetTitle: string;
  email: string;
  phone: string;
  linkedin: string;
  resumeText: string;
  jobDescription: string;
  strategy: "ATS-heavy" | "recruiter-readable" | "consulting-style" | "contract-focused" | "federal-focused";
}

export interface ResumeGenerationResult {
  id: string;
  role: RoleName;
  domain: DomainName;
  detectedSkills: string[];
  canonicalJD: string;
  resumeMarkdown: string;
  scores: ResumeScoreSet;
  selectedComponents: ResumeComponent[];
  warnings: string[];
  explainability: string[];
  costGovernance: {
    route: string;
    baselineTokenEstimate: number;
    optimizedTokenEstimate: number;
    estimatedSavingsPercent: number;
    reuseRatio: number;
  };
  skillGaps: string[];
  timelineChecks: string[];
}

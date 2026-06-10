export type PortalRole =
  | "SUPER_ADMIN"
  | "TENANT_COMPANY_ADMIN"
  | "INDIVIDUAL_CANDIDATE"
  | "ADMIN_OPS"
  | "REVIEWER"
  | "RECRUITER"
  | "TENANT_CANDIDATE";

export type UserStatus = "active" | "pending" | "suspended";

export interface Tenant {
  id: string;
  name: string;
  plan: "Agency" | "Enterprise" | "Individual";
  status: "active" | "trial" | "past_due";
  billingOwner: string;
  monthlyLimitCents: number;
  monthlySpendCents: number;
  createdAt: string;
}

export interface UsageStats {
  resumeGenerations: number;
  jobApplications: number;
  emailsSent: number;
  incomingEmails: number;
  approvalsRequested: number;
  tokensUsed: number;
  costCents: number;
}

export interface PortalUser {
  id: string;
  tenantId?: string;
  name: string;
  email: string;
  role: PortalRole;
  status: UserStatus;
  title: string;
  createdAt: string;
  lastLogin: string;
  usage: UsageStats;
}

export interface CompanyRole {
  id: string;
  tenantId: string;
  name: string;
  permissions: string[];
  userCount: number;
  status: "active" | "archived";
}

export interface MailThread {
  id: string;
  tenantId?: string;
  userId: string;
  jobId: string;
  contactName: string;
  contactEmail: string;
  company: string;
  subject: string;
  direction: "outbound" | "incoming";
  status: "draft" | "approval_requested" | "approved" | "sent" | "incoming" | "reply_drafted";
  lastMessage: string;
  draft: string;
  approvedBy?: string;
  updatedAt: string;
}

export interface BillingLedgerItem {
  id: string;
  tenantId?: string;
  userId: string;
  label: string;
  units: number;
  amountCents: number;
  status: "open" | "paid" | "included";
  createdAt: string;
}

export interface AdminReviewItem {
  id: string;
  type: "component" | "domain" | "technology" | "timeline";
  title: string;
  submittedBy: string;
  status: "draft" | "duplicate_scan" | "review" | "approved" | "rejected" | "published";
  similarityScore: number;
  timelineStatus: "valid" | "warning" | "blocked";
  notes: string;
}

export const PERMISSIONS: Record<PortalRole, string[]> = {
  SUPER_ADMIN: [
    "platform:full",
    "tenants:create",
    "users:create",
    "users:manage",
    "billing:manage",
    "admin_ops:manage",
    "impersonation:read"
  ],
  TENANT_COMPANY_ADMIN: [
    "tenant:manage_users",
    "tenant:manage_roles",
    "tenant:view_usage",
    "candidate:generate_resume",
    "candidate:track_jobs",
    "jobs:create_internal",
    "connector:manage",
    "email:approve",
    "billing:view_tenant"
  ],
  INDIVIDUAL_CANDIDATE: [
    "candidate:generate_resume",
    "candidate:track_jobs",
    "connector:manage",
    "email:draft",
    "email:request_approval",
    "billing:pay_self"
  ],
  ADMIN_OPS: [
    "components:create",
    "components:approve",
    "components:publish",
    "domains:manage",
    "technologies:manage",
    "duplicates:review",
    "timeline:manage",
    "analytics:view"
  ],
  REVIEWER: ["components:review", "email:approve", "analytics:view"],
  RECRUITER: [
    "candidate:generate_resume",
    "candidate:track_jobs",
    "jobs:create_internal",
    "connector:manage",
    "email:draft"
  ],
  TENANT_CANDIDATE: [
    "candidate:generate_resume",
    "candidate:track_jobs",
    "connector:manage",
    "email:draft",
    "email:request_approval"
  ]
};

export const ROLE_LABELS: Record<PortalRole, string> = {
  SUPER_ADMIN: "Super Admin",
  TENANT_COMPANY_ADMIN: "Tenant Company Admin",
  INDIVIDUAL_CANDIDATE: "Individual Candidate",
  ADMIN_OPS: "Admin Ops",
  REVIEWER: "Reviewer",
  RECRUITER: "Recruiter",
  TENANT_CANDIDATE: "Tenant Candidate"
};

export const SIGN_IN_USERS = [
  { email: "superadmin@askmehire.com", password: "Askmehire@123", userId: "user-super" },
  { email: "admin@northstarrecruiting.com", password: "Tenant@123", userId: "user-tenant-admin" },
  { email: "jordan.patel@northstarrecruiting.com", password: "Candidate@123", userId: "user-tenant-candidate-1" },
  { email: "alex.morgan@example.com", password: "Candidate@123", userId: "user-individual" },
  { email: "ops@askmehire.com", password: "Ops@123", userId: "user-admin-ops" }
];

export const PORTAL_TENANTS: Tenant[] = [
  {
    id: "tenant-lp",
    name: "askmehire Platform",
    plan: "Enterprise",
    status: "active",
    billingOwner: "superadmin@askmehire.com",
    monthlyLimitCents: 250000,
    monthlySpendCents: 48250,
    createdAt: "2026-05-01"
  },
  {
    id: "tenant-northstar",
    name: "Northstar Recruiting",
    plan: "Agency",
    status: "active",
    billingOwner: "admin@northstarrecruiting.com",
    monthlyLimitCents: 100000,
    monthlySpendCents: 23640,
    createdAt: "2026-05-03"
  }
];

export const PORTAL_USERS: PortalUser[] = [
  {
    id: "user-super",
    tenantId: "tenant-lp",
    name: "Sai Kankanala",
    email: "superadmin@askmehire.com",
    role: "SUPER_ADMIN",
    status: "active",
    title: "Platform Owner",
    createdAt: "2026-05-01",
    lastLogin: "2026-05-10",
    usage: {
      resumeGenerations: 12,
      jobApplications: 3,
      emailsSent: 6,
      incomingEmails: 4,
      approvalsRequested: 2,
      tokensUsed: 94200,
      costCents: 1830
    }
  },
  {
    id: "user-tenant-admin",
    tenantId: "tenant-northstar",
    name: "Maya Chen",
    email: "admin@northstarrecruiting.com",
    role: "TENANT_COMPANY_ADMIN",
    status: "active",
    title: "Recruiting Operations Admin",
    createdAt: "2026-05-03",
    lastLogin: "2026-05-10",
    usage: {
      resumeGenerations: 64,
      jobApplications: 28,
      emailsSent: 41,
      incomingEmails: 17,
      approvalsRequested: 11,
      tokensUsed: 512000,
      costCents: 9960
    }
  },
  {
    id: "user-individual",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    role: "INDIVIDUAL_CANDIDATE",
    status: "active",
    title: "Senior Data Engineer",
    createdAt: "2026-05-04",
    lastLogin: "2026-05-10",
    usage: {
      resumeGenerations: 9,
      jobApplications: 5,
      emailsSent: 7,
      incomingEmails: 3,
      approvalsRequested: 2,
      tokensUsed: 77400,
      costCents: 2470
    }
  },
  {
    id: "user-admin-ops",
    tenantId: "tenant-lp",
    name: "Priya Raman",
    email: "ops@askmehire.com",
    role: "ADMIN_OPS",
    status: "active",
    title: "Resume Intelligence Ops Lead",
    createdAt: "2026-05-02",
    lastLogin: "2026-05-10",
    usage: {
      resumeGenerations: 4,
      jobApplications: 0,
      emailsSent: 0,
      incomingEmails: 0,
      approvalsRequested: 0,
      tokensUsed: 20400,
      costCents: 510
    }
  },
  {
    id: "user-tenant-candidate-1",
    tenantId: "tenant-northstar",
    name: "Jordan Patel",
    email: "jordan.patel@northstarrecruiting.com",
    role: "TENANT_CANDIDATE",
    status: "active",
    title: "Java Backend Engineer",
    createdAt: "2026-05-05",
    lastLogin: "2026-05-09",
    usage: {
      resumeGenerations: 18,
      jobApplications: 9,
      emailsSent: 14,
      incomingEmails: 6,
      approvalsRequested: 4,
      tokensUsed: 135800,
      costCents: 2810
    }
  },
  {
    id: "user-tenant-candidate-2",
    tenantId: "tenant-northstar",
    name: "Elena Torres",
    email: "elena.torres@northstarrecruiting.com",
    role: "TENANT_CANDIDATE",
    status: "pending",
    title: "SDET Automation Engineer",
    createdAt: "2026-05-08",
    lastLogin: "Invite pending",
    usage: {
      resumeGenerations: 0,
      jobApplications: 0,
      emailsSent: 0,
      incomingEmails: 0,
      approvalsRequested: 0,
      tokensUsed: 0,
      costCents: 0
    }
  }
];

export const COMPANY_ROLES: CompanyRole[] = [
  {
    id: "company-role-admin",
    tenantId: "tenant-northstar",
    name: "Company Resume Admin",
    permissions: ["tenant:view_usage", "candidate:generate_resume", "email:approve"],
    userCount: 1,
    status: "active"
  },
  {
    id: "company-role-candidate",
    tenantId: "tenant-northstar",
    name: "Company Candidate",
    permissions: ["candidate:generate_resume", "candidate:track_jobs", "email:request_approval"],
    userCount: 2,
    status: "active"
  }
];

export const MAIL_THREADS: MailThread[] = [
  {
    id: "mail-001",
    userId: "user-individual",
    jobId: "job-001",
    contactName: "Rachel Kim",
    contactEmail: "rachel.kim@northbridge.example",
    company: "Northbridge Bank",
    subject: "Senior Data Engineer application follow-up",
    direction: "outbound",
    status: "approval_requested",
    lastMessage: "Draft prepared with resume-specific context and payment data lineage experience.",
    draft: "Hi Rachel, I applied for the Senior Data Engineer role and wanted to share how my Spark, Kafka, AWS, and payment reconciliation work maps to the modernization program. I would be glad to discuss the fit this week.",
    updatedAt: "2026-05-10"
  },
  {
    id: "mail-002",
    tenantId: "tenant-northstar",
    userId: "user-tenant-candidate-1",
    jobId: "job-002",
    contactName: "Devon Lee",
    contactEmail: "devon.lee@cedarpayments.example",
    company: "Cedar Payments",
    subject: "Recruiter response: Java Backend Engineer",
    direction: "incoming",
    status: "reply_drafted",
    lastMessage: "Can you send a brief summary of your Spring Boot and Kafka production support work?",
    draft: "Hi Devon, thanks for reaching out. My recent backend work focused on Spring Boot payment lookup services, Kafka event handling, PostgreSQL audit data, and production issue triage for regulated workflows.",
    updatedAt: "2026-05-10"
  }
];

export const BILLING_LEDGER: BillingLedgerItem[] = [
  {
    id: "bill-001",
    userId: "user-individual",
    label: "Resume generations",
    units: 9,
    amountCents: 1350,
    status: "open",
    createdAt: "2026-05-10"
  },
  {
    id: "bill-002",
    userId: "user-individual",
    label: "Email workflows",
    units: 7,
    amountCents: 420,
    status: "open",
    createdAt: "2026-05-10"
  },
  {
    id: "bill-003",
    tenantId: "tenant-northstar",
    userId: "user-tenant-admin",
    label: "Tenant candidate usage",
    units: 64,
    amountCents: 9960,
    status: "included",
    createdAt: "2026-05-10"
  }
];

export const ADMIN_REVIEW_QUEUE: AdminReviewItem[] = [
  {
    id: "review-001",
    type: "component",
    title: "Microsoft Fabric 2018 banking migration bullet",
    submittedBy: "system",
    status: "review",
    similarityScore: 42,
    timelineStatus: "blocked",
    notes: "Fabric is invalid for 2018. Replace with Azure Data Factory, SSIS, or Spark depending on source history."
  },
  {
    id: "review-002",
    type: "component",
    title: "Claims regression automation wording",
    submittedBy: "reviewer@askmehire.com",
    status: "duplicate_scan",
    similarityScore: 87,
    timelineStatus: "valid",
    notes: "Semantic overlap exceeded threshold. Requires rewrite before publishing."
  },
  {
    id: "review-003",
    type: "technology",
    title: "Playwright adoption window",
    submittedBy: "ops@askmehire.com",
    status: "approved",
    similarityScore: 0,
    timelineStatus: "valid",
    notes: "Use 2020 onward only."
  }
];

export function cents(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount / 100);
}

export function roleCan(user: PortalUser | null, permission: string) {
  if (!user) {
    return false;
  }
  const permissions = PERMISSIONS[user.role] || [];
  return permissions.includes("platform:full") || permissions.includes(permission);
}

export function tenantName(tenants: Tenant[], tenantId?: string) {
  if (!tenantId) {
    return "Individual";
  }
  return tenants.find((tenant) => tenant.id === tenantId)?.name || "Unknown tenant";
}

export function emptyUsage(): UsageStats {
  return {
    resumeGenerations: 0,
    jobApplications: 0,
    emailsSent: 0,
    incomingEmails: 0,
    approvalsRequested: 0,
    tokensUsed: 0,
    costCents: 0
  };
}

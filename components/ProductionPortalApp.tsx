"use client";

import { useEffect, useMemo, useState } from "react";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import {
  Activity,
  Archive,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  DatabaseZap,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  History,
  KeyRound,
  Link2,
  Layers3,
  Library,
  LockKeyhole,
  LogOut,
  Mail,
  Network,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  WandSparkles,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AUDIT_EVENTS,
  DOMAIN_PROFILES,
  INTELLIGENCE_COMPONENTS,
  JOB_LISTINGS,
  PROMPT_VERSIONS,
  SUPPORTED_DOMAINS,
  TECHNOLOGY_TIMELINES
} from "@/lib/catalog";
import {
  DEFAULT_CANDIDATE_PROFILES,
  JOB_PORTAL_CONNECTORS,
  buildDefaultProfileForUser,
  createAppliedRoleRecord,
  syncJobsForCandidate
} from "@/lib/job-integrations";
import { matchSyncedRoleToCatalogJobId, pickSeededResumeLegacyId } from "@/lib/job-catalog-match";
import {
  buildFormattedResumePlainText,
  buildResumeSourceText,
  createSubbareddySampleInput
} from "@/lib/resume-inputs";
import type {
  CandidateResumeInput,
  CandidateResumeInputTemplate,
  ResumeClientInput,
  ResumeRunRecord,
  TemplateLimitMap
} from "@/lib/resume-inputs";
import type {
  AppliedRoleRecord,
  CandidateApplicationProfile,
  ConnectorStatus,
  SyncedRole
} from "@/lib/job-integrations";
import {
  ADMIN_REVIEW_QUEUE,
  BILLING_LEDGER,
  COMPANY_ROLES,
  MAIL_THREADS,
  PERMISSIONS,
  PORTAL_TENANTS,
  PORTAL_USERS,
  ROLE_LABELS,
  SIGN_IN_USERS,
  cents,
  emptyUsage,
  roleCan,
  tenantName
} from "@/lib/portal";
import type {
  AdminReviewItem,
  BillingLedgerItem,
  CompanyRole,
  MailThread,
  PortalRole,
  PortalUser,
  Tenant
} from "@/lib/portal";
import type {
  ApplicationRecord,
  JobsApiData,
  ResumeGenerationRequest,
  ResumeGenerationResult
} from "@/lib/types";
import { fetchApiEnvelope, unwrapResumeGeneration } from "@/lib/http/unwrap-api";
import { reviewComponentDraft } from "@/lib/resume-engine";

type TabId =
  | "command"
  | "access"
  | "tenant"
  | "tenant-candidates"
  | "tenant-templates"
  | "tenant-usage"
  | "candidate"
  | "mail"
  | "ops"
  | "ops-components"
  | "ops-approvals"
  | "ops-domains"
  | "ops-technologies"
  | "ops-duplicates"
  | "ops-timeline"
  | "ops-review"
  | "ops-analytics"
  | "ops-bulk"
  | "repository"
  | "jobs"
  | "billing"
  | "architecture";

const ADMIN_OPS_TABS: TabId[] = [
  "ops",
  "ops-components",
  "ops-approvals",
  "ops-domains",
  "ops-technologies",
  "ops-duplicates",
  "ops-timeline",
  "ops-review",
  "ops-analytics",
  "ops-bulk"
];

const ADMIN_OPS_NAV_ITEMS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "ops", label: "Ops Overview", icon: ShieldCheck },
  { id: "ops-components", label: "Components", icon: Library },
  { id: "ops-approvals", label: "Approvals", icon: BadgeCheck },
  { id: "ops-domains", label: "Domains", icon: Building2 },
  { id: "ops-technologies", label: "Technologies", icon: DatabaseZap },
  { id: "ops-duplicates", label: "Duplicate Scan", icon: Fingerprint },
  { id: "ops-timeline", label: "Timeline Rules", icon: Clock3 },
  { id: "ops-review", label: "AI Content Review", icon: Sparkles },
  { id: "ops-analytics", label: "Ops Analytics", icon: BarChart3 },
  { id: "ops-bulk", label: "Bulk Loader", icon: Upload }
];

const DEFAULT_TEMPLATE_LIMIT = 3;

function apiTenantHeaders(tenantUuid: string | null | undefined): Record<string, string> {
  if (!tenantUuid || !/^[0-9a-f-]{36}$/i.test(tenantUuid)) {
    return {};
  }
  return { "x-tenant-id": tenantUuid };
}

const SAMPLE_RESUME = `Alex Morgan
Senior Data Engineer
alex.morgan@example.com | (555) 010-2048 | linkedin.com/in/alexmorgan

Northlake Analytics | Data Engineer | 2021 - 2025
Built Python and SQL pipelines for banking reporting, payment operations, and daily reconciliation dashboards.
Worked with AWS S3, Airflow, PostgreSQL, Spark, and Kafka for data processing and operational monitoring.

Bright Claims Group | ETL Developer | 2018 - 2021
Supported claims reporting feeds, provider extracts, and SQL Server data quality checks for healthcare operations.

Education: M.S. Information Systems
Certifications: AWS Certified Data Analytics Specialty`;

const SAMPLE_JD = `Senior Data Engineer needed for a banking modernization program supporting payment data, ledger reconciliation, fraud monitoring, and audit reporting.
Must have Apache Spark, Kafka, AWS, SQL, Airflow, data lineage, strong ETL design, and production support experience.
Preferred experience with regulated banking environments, KYC/AML reporting, PostgreSQL, CI/CD, and dashboard-ready data marts.
Responsibilities include building reusable data pipelines, validating payment feeds, improving data quality, documenting lineage, and partnering with application teams.`;

const INITIAL_FORM: ResumeGenerationRequest = {
  fullName: "Alex Morgan",
  targetTitle: "Senior Data Engineer",
  email: "alex.morgan@example.com",
  phone: "(555) 010-2048",
  linkedin: "linkedin.com/in/alexmorgan",
  resumeText: SAMPLE_RESUME,
  jobDescription: SAMPLE_JD,
  strategy: "recruiter-readable"
};

const ROLE_OPTIONS: PortalRole[] = [
  "TENANT_COMPANY_ADMIN",
  "INDIVIDUAL_CANDIDATE",
  "ADMIN_OPS",
  "REVIEWER",
  "RECRUITER",
  "TENANT_CANDIDATE"
];

function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      setState(JSON.parse(stored) as T);
    }
  }, [key]);

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "teal"
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: LucideIcon;
  tone?: "teal" | "gold" | "coral" | "ink";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sublabel}</small>
    </article>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="score-track" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Pill({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function SectionTitle({
  icon: Icon,
  title,
  action
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function SignInScreen({ onSignIn }: { onSignIn: (portalKey: string) => void }) {
  const [email, setEmail] = useState("superadmin@askmehire.com");
  const [password, setPassword] = useState("Askmehire@123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitWithCredentials(nextEmail: string, nextPassword: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: nextEmail.trim().toLowerCase(),
        password: nextPassword,
        redirect: false
      });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      const s = await getSession();
      const portalKey = s?.user?.portalKey;
      if (!portalKey) {
        setError("Signed in but portal profile is missing. Run db seed and ensure portal_key is set.");
        return;
      }
      onSignIn(portalKey);
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    void submitWithCredentials(email, password);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark auth-brand">
          <img className="brand-logo" src="/askmehire-mark.png" alt="askmehire logo" />
          <span>
            <strong>askmehire</strong>
            <small>Production portal access</small>
          </span>
        </div>

        <h1>Sign in as platform super admin</h1>
        <p>
          Use the seeded super admin to create tenant admins, individual candidates, and admin ops users.
        </p>

        <label className="stacked">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="stacked">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        {error ? <div className="error-banner">{error}</div> : null}

        <button className="icon-button text auth-submit" onClick={submit} disabled={busy}>
          <KeyRound size={17} />
          {busy ? "Signing in…" : "Sign In"}
        </button>

        <div className="quick-login-grid">
          {SIGN_IN_USERS.map((credential) => {
            const user = PORTAL_USERS.find((item) => item.id === credential.userId);
            if (!user) {
              return null;
            }
            return (
              <button
                key={credential.userId}
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmail(credential.email);
                  setPassword(credential.password);
                  void submitWithCredentials(credential.email, credential.password);
                }}
              >
                <strong>{ROLE_LABELS[user.role]}</strong>
                <span>{credential.email}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function navFor(user: PortalUser): Array<{ id: TabId; label: string; icon: LucideIcon }> {
  const base: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
    { id: "command", label: "Command Center", icon: Gauge }
  ];

  if (user.role === "SUPER_ADMIN") {
    return [
      ...base,
      { id: "access", label: "Access Control", icon: Users },
      { id: "tenant", label: "Tenant Admin", icon: Building2 },
      { id: "candidate", label: "Candidate Desk", icon: WandSparkles },
      { id: "mail", label: "Email Approvals", icon: Mail },
      ...ADMIN_OPS_NAV_ITEMS,
      { id: "repository", label: "Repository", icon: Library },
      { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
      { id: "billing", label: "Billing", icon: CreditCard },
      { id: "architecture", label: "Architecture", icon: Network }
    ];
  }

  if (user.role === "TENANT_COMPANY_ADMIN") {
    return [
      { id: "command", label: "Company Overview", icon: Gauge },
      { id: "tenant-candidates", label: "Candidates", icon: Users },
      { id: "tenant-templates", label: "Template Requests", icon: FileText },
      { id: "tenant-usage", label: "Usage & Limits", icon: BarChart3 },
      { id: "mail", label: "Email Approvals", icon: Mail },
      { id: "jobs", label: "Job Activity", icon: BriefcaseBusiness },
      { id: "billing", label: "Billing", icon: CreditCard }
    ];
  }

  if (user.role === "ADMIN_OPS" || user.role === "REVIEWER") {
    return [
      ...base,
      ...ADMIN_OPS_NAV_ITEMS,
      { id: "repository", label: "Repository", icon: Library },
      { id: "architecture", label: "Architecture", icon: Network }
    ];
  }

  return [
    ...base,
    { id: "candidate", label: "Candidate Desk", icon: WandSparkles },
    { id: "mail", label: "Email", icon: Mail },
    { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
    { id: "billing", label: "Billing", icon: CreditCard }
  ];
}

function CommandCenter({
  currentUser,
  users,
  tenants,
  result
}: {
  currentUser: PortalUser;
  users: PortalUser[];
  tenants: Tenant[];
  result: ResumeGenerationResult | null;
}) {
  const tenantUsers = currentUser.role === "TENANT_COMPANY_ADMIN"
    ? users.filter((user) => user.tenantId === currentUser.tenantId)
    : users;
  const totalSpend = tenantUsers.reduce((sum, user) => sum + user.usage.costCents, 0);
  const totalResumes = tenantUsers.reduce((sum, user) => sum + user.usage.resumeGenerations, 0);
  const pendingApprovals = MAIL_THREADS.filter((thread) => thread.status === "approval_requested").length;

  return (
    <div className="screen-stack">
      <section className="metric-grid">
        <MetricCard label="Active Users" value={`${tenantUsers.filter((user) => user.status === "active").length}`} sublabel="tenant and candidate profiles" icon={Users} />
        <MetricCard label="Resume Runs" value={`${totalResumes}`} sublabel="usage tracked by user and tenant" icon={FileCheck2} tone="teal" />
        <MetricCard label="AI Spend" value={cents(totalSpend)} sublabel="metered workflow cost" icon={CircleDollarSign} tone="gold" />
        <MetricCard label="Email Approvals" value={`${pendingApprovals}`} sublabel="drafts waiting for review" icon={Mail} tone="coral" />
      </section>

      <section className="dashboard-layout">
        <div className="panel wide">
          <SectionTitle icon={Workflow} title="Production Workflow" />
          <div className="pipeline">
            {[
              ["Identity and RBAC", "Super admin, tenant admin, candidate, admin ops, reviewer, recruiter"],
              ["Tenant Isolation", "Company candidates, roles, usage, and billing stay scoped to tenant"],
              ["Resume Intelligence", "JD mapping, component retrieval, scoring, timeline validation"],
              ["Application Lifecycle", "Job tracking, outreach drafts, incoming mail, approval before send"],
              ["Governance", "Audit-ready admin ops workflow for components, domains, technologies, and prompts"]
            ].map(([title, copy], index) => (
              <div className="pipeline-step" key={title}>
                <span>{index + 1}</span>
                <strong>{title}</strong>
                <small>{copy}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <SectionTitle icon={Activity} title="Current Quality Scores" />
          <div className="score-list">
            <ScoreBar label="ATS" value={result?.scores.ats ?? 91} />
            <ScoreBar label="Human realism" value={result?.scores.humanRealism ?? 88} />
            <ScoreBar label="Domain authenticity" value={result?.scores.domainAuthenticity ?? 91} />
            <ScoreBar label="Timeline integrity" value={result?.scores.timelineIntegrity ?? 96} />
          </div>
        </div>
      </section>

      <section className="dashboard-layout">
        <div className="panel">
          <SectionTitle icon={Building2} title="Tenant Health" />
          <div className="tenant-health-grid">
            {tenants.map((tenant) => (
              <article key={tenant.id}>
                <div>
                  <strong>{tenant.name}</strong>
                  <Pill tone={tenant.status === "active" ? "green" : "amber"}>{tenant.status}</Pill>
                </div>
                <ScoreBar label="Monthly budget used" value={Math.round((tenant.monthlySpendCents / tenant.monthlyLimitCents) * 100)} />
                <span>{cents(tenant.monthlySpendCents)} of {cents(tenant.monthlyLimitCents)}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <SectionTitle icon={History} title="Audit Feed" />
          <div className="event-list">
            {AUDIT_EVENTS.map((event) => (
              <article key={event.id}>
                <Pill tone={event.severity === "warning" ? "amber" : "green"}>{event.severity}</Pill>
                <strong>{event.action}</strong>
                <span>{new Date(event.timestamp).toLocaleString()}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AccessControl({
  users,
  setUsers,
  tenants
}: {
  users: PortalUser[];
  setUsers: (users: PortalUser[]) => void;
  tenants: Tenant[];
}) {
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    title: "",
    role: "TENANT_COMPANY_ADMIN" as PortalRole,
    tenantId: tenants[1]?.id || ""
  });

  function createUser() {
    if (!draft.name.trim() || !draft.email.trim()) {
      return;
    }
    const needsTenant = draft.role === "TENANT_COMPANY_ADMIN" || draft.role === "TENANT_CANDIDATE" || draft.role === "RECRUITER";
    const newUser: PortalUser = {
      id: `user-${Date.now()}`,
      tenantId: needsTenant ? draft.tenantId : draft.role === "ADMIN_OPS" ? "tenant-lp" : undefined,
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
      status: "active",
      title: draft.title.trim() || ROLE_LABELS[draft.role],
      createdAt: today(),
      lastLogin: "Invite sent",
      usage: emptyUsage()
    };
    setUsers([newUser, ...users]);
    setDraft({ ...draft, name: "", email: "", title: "" });
  }

  function updateStatus(userId: string, status: PortalUser["status"]) {
    setUsers(users.map((user) => (user.id === userId ? { ...user, status } : user)));
  }

  function removeUser(userId: string) {
    setUsers(users.filter((user) => user.id !== userId));
  }

  return (
    <div className="screen-stack">
      <section className="panel">
        <SectionTitle icon={UserPlus} title="Create User Profile" />
        <div className="form-grid access-form">
          <label>
            <span>Name</span>
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            <span>Email</span>
            <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
          </label>
          <label>
            <span>Profile type</span>
            <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as PortalRole })}>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Tenant</span>
            <select value={draft.tenantId} onChange={(event) => setDraft({ ...draft, tenantId: event.target.value })}>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <button className="icon-button text" onClick={createUser}>
            <Plus size={17} />
            Create Profile
          </button>
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={Users} title="Platform Users" />
        <div className="data-table">
          <div className="data-row portal-users header">
            <span>User</span>
            <span>Role</span>
            <span>Tenant</span>
            <span>Usage</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {users.map((user) => (
            <div className="data-row portal-users" key={user.id}>
              <span>
                <strong>{user.name}</strong>
                <small>{user.email} | {user.title}</small>
              </span>
              <span>{ROLE_LABELS[user.role]}</span>
              <span>{tenantName(tenants, user.tenantId)}</span>
              <span>{user.usage.resumeGenerations} resumes | {cents(user.usage.costCents)}</span>
              <span><Pill tone={user.status === "active" ? "green" : user.status === "pending" ? "amber" : "red"}>{user.status}</Pill></span>
              <span className="row-actions">
                <button className="icon-button" onClick={() => updateStatus(user.id, user.status === "active" ? "suspended" : "active")} title="Toggle status">
                  <RefreshCw size={15} />
                </button>
                <button className="icon-button" onClick={() => removeUser(user.id)} title="Delete user">
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TenantAdmin({
  view = "tenant",
  currentUser,
  users,
  setUsers,
  tenants,
  companyRoles,
  setCompanyRoles,
  resumeTemplates,
  setResumeTemplates,
  templateLimits,
  setTemplateLimits,
  resumeRuns
}: {
  view?: TabId;
  currentUser: PortalUser;
  users: PortalUser[];
  setUsers: (users: PortalUser[]) => void;
  tenants: Tenant[];
  companyRoles: CompanyRole[];
  setCompanyRoles: (roles: CompanyRole[]) => void;
  resumeTemplates: CandidateResumeInputTemplate[];
  setResumeTemplates: (templates: CandidateResumeInputTemplate[]) => void;
  templateLimits: TemplateLimitMap;
  setTemplateLimits: (limits: TemplateLimitMap) => void;
  resumeRuns: ResumeRunRecord[];
}) {
  const tenantId = currentUser.role === "SUPER_ADMIN" ? "tenant-northstar" : currentUser.tenantId || "tenant-northstar";
  const tenant = tenants.find((item) => item.id === tenantId);
  const tenantUsers = users.filter((user) => user.tenantId === tenantId);
  const tenantCandidateUsers = tenantUsers.filter((user) => user.role === "TENANT_CANDIDATE" || user.role === "RECRUITER");
  const tenantResumeTemplates = resumeTemplates.filter((template) => template.tenantId === tenantId);
  const tenantResumeRuns = resumeRuns.filter((run) => run.tenantId === tenantId);
  const [candidateDraft, setCandidateDraft] = useState({ name: "", email: "", title: "Data Engineer" });
  const [roleDraft, setRoleDraft] = useState("Candidate Resume Reviewer");
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [adminDraftInput, setAdminDraftInput] = useState<CandidateResumeInput | null>(null);
  const editingTemplate = tenantResumeTemplates.find((template) => template.id === editingTemplateId);

  function inviteCandidate() {
    if (!candidateDraft.name || !candidateDraft.email) {
      return;
    }
    setUsers([
      {
        id: `user-${Date.now()}`,
        tenantId,
        name: candidateDraft.name,
        email: candidateDraft.email,
        role: "TENANT_CANDIDATE",
        status: "pending",
        title: candidateDraft.title,
        createdAt: today(),
        lastLogin: "Invite pending",
        usage: emptyUsage()
      },
      ...users
    ]);
    setCandidateDraft({ name: "", email: "", title: "Data Engineer" });
  }

  function updateCandidateStatus(userId: string, status: PortalUser["status"]) {
    setUsers(users.map((user) => user.id === userId ? { ...user, status } : user));
  }

  function addCompanyRole() {
    if (!roleDraft.trim()) {
      return;
    }
    setCompanyRoles([
      {
        id: `company-role-${Date.now()}`,
        tenantId,
        name: roleDraft.trim(),
        permissions: ["candidate:generate_resume", "candidate:track_jobs", "email:request_approval"],
        userCount: 0,
        status: "active"
      },
      ...companyRoles
    ]);
    setRoleDraft("");
  }

  function updateTemplateLimit(userId: string, value: number) {
    setTemplateLimits({
      ...templateLimits,
      [userId]: Math.max(1, Math.min(50, value))
    });
  }

  function startTemplateEdit(template: CandidateResumeInputTemplate) {
    setEditingTemplateId(template.id);
    setAdminDraftInput(cloneResumeInput(template.input));
  }

  function updateAdminInput<K extends keyof Omit<CandidateResumeInput, "clients">>(key: K, value: CandidateResumeInput[K]) {
    if (!adminDraftInput) {
      return;
    }
    setAdminDraftInput({ ...adminDraftInput, [key]: value } as CandidateResumeInput);
  }

  function updateAdminClient(index: number, key: keyof ResumeClientInput, value: string) {
    if (!adminDraftInput) {
      return;
    }
    setAdminDraftInput({
      ...adminDraftInput,
      clients: adminDraftInput.clients.map((client, clientIndex) => (
        clientIndex === index ? { ...client, [key]: value } : client
      ))
    });
  }

  function removeAdminClient(index: number) {
    if (!adminDraftInput || adminDraftInput.clients.length <= 1) {
      return;
    }
    setAdminDraftInput({
      ...adminDraftInput,
      clients: adminDraftInput.clients.filter((_, clientIndex) => clientIndex !== index)
    });
  }

  function saveAdminTemplateUpdate() {
    if (!editingTemplate || !adminDraftInput) {
      return;
    }
    setResumeTemplates(resumeTemplates.map((template) => template.id === editingTemplate.id ? {
      ...template,
      input: cloneResumeInput(adminDraftInput),
      status: "admin_updated",
      changeRequest: undefined,
      updatedAt: today()
    } : template));
    setEditingTemplateId("");
    setAdminDraftInput(null);
  }

  function deleteTemplate(templateId: string) {
    setResumeTemplates(resumeTemplates.filter((template) => template.id !== templateId));
    if (editingTemplateId === templateId) {
      setEditingTemplateId("");
      setAdminDraftInput(null);
    }
  }

  const tenantSpend = tenantUsers.reduce((sum, user) => sum + user.usage.costCents, 0);
  const todayResumeRuns = tenantResumeRuns.filter((run) => run.generatedAt === today());
  const pendingTemplateRequests = tenantResumeTemplates.filter((template) =>
    template.status === "change_requested" || template.status === "delete_requested"
  );

  const overviewPanel = (
    <>
      <section className="metric-grid">
        <MetricCard label="Active Candidates" value={`${tenantCandidateUsers.filter((user) => user.status === "active").length}`} sublabel="company candidate seats" icon={Users} />
        <MetricCard label="Template Requests" value={`${pendingTemplateRequests.length}`} sublabel="candidate updates or delete asks" icon={FileText} tone="gold" />
        <MetricCard label="Today's Resumes" value={`${todayResumeRuns.length}`} sublabel="candidate-generated drafts" icon={FileCheck2} tone="teal" />
        <MetricCard label="Tenant Spend" value={cents(tenantSpend)} sublabel="current tracked usage" icon={CircleDollarSign} tone="coral" />
      </section>
      <section className="dashboard-layout">
        <div className="panel">
          <SectionTitle icon={ShieldCheck} title="Needs Admin Attention" />
          <div className="queue-list">
            <div>
              <strong>{pendingTemplateRequests.length}</strong>
              <span>Template update or delete requests</span>
            </div>
            <div>
              <strong>{MAIL_THREADS.filter((thread) => thread.tenantId === tenantId && thread.status === "approval_requested").length}</strong>
              <span>Email drafts waiting for approval</span>
            </div>
            <div>
              <strong>{tenantCandidateUsers.filter((user) => user.status === "pending").length}</strong>
              <span>Candidate invites pending</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <SectionTitle icon={Building2} title={tenant?.name || "Company"} />
          <div className="tenant-health-grid">
            <article>
              <div>
                <strong>{tenant?.plan || "Agency"}</strong>
                <Pill tone={tenant?.status === "active" ? "green" : "amber"}>{tenant?.status || "active"}</Pill>
              </div>
              <ScoreBar label="Monthly budget used" value={tenant ? Math.round((tenant.monthlySpendCents / tenant.monthlyLimitCents) * 100) : 0} />
              <span>{tenant ? `${cents(tenant.monthlySpendCents)} of ${cents(tenant.monthlyLimitCents)}` : "No tenant budget configured"}</span>
            </article>
          </div>
        </div>
      </section>
    </>
  );

  const candidatesPanel = (
    <>
      <section className="panel">
        <SectionTitle icon={UserPlus} title="Invite Candidate" />
        <div className="form-grid compact">
          <label>
            <span>Name</span>
            <input value={candidateDraft.name} onChange={(event) => setCandidateDraft({ ...candidateDraft, name: event.target.value })} />
          </label>
          <label>
            <span>Email</span>
            <input value={candidateDraft.email} onChange={(event) => setCandidateDraft({ ...candidateDraft, email: event.target.value })} />
          </label>
          <label className="full">
            <span>Target role</span>
            <input value={candidateDraft.title} onChange={(event) => setCandidateDraft({ ...candidateDraft, title: event.target.value })} />
          </label>
          <button className="icon-button text full" onClick={inviteCandidate}>
            <Plus size={17} />
            Send Invite
          </button>
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={Users} title="Candidate Access" />
        <div className="data-table">
          <div className="data-row tenant-candidate-row header">
            <span>Candidate</span>
            <span>Target Role</span>
            <span>Status</span>
            <span>Resumes</span>
            <span>Templates</span>
            <span>Action</span>
          </div>
          {tenantCandidateUsers.map((user) => {
            const userTemplates = tenantResumeTemplates.filter((template) => template.userId === user.id);
            return (
              <div className="data-row tenant-candidate-row" key={user.id}>
                <span><strong>{user.name}</strong><small>{user.email}</small></span>
                <span>{user.title}</span>
                <span><Pill tone={user.status === "active" ? "green" : user.status === "pending" ? "amber" : "red"}>{user.status}</Pill></span>
                <span>{user.usage.resumeGenerations}</span>
                <span>{userTemplates.length}</span>
                <span className="row-actions">
                  <button
                    className="icon-button"
                    onClick={() => updateCandidateStatus(user.id, user.status === "active" ? "suspended" : "active")}
                    title={user.status === "active" ? "Suspend candidate" : "Activate candidate"}
                  >
                    <RefreshCw size={15} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );

  const usagePanel = (
    <>
      <section className="panel">
        <SectionTitle icon={BarChart3} title="Usage and Template Limits" />
        <div className="data-table">
          <div className="data-row tenant-usage header">
            <span>Employee</span>
            <span>Today</span>
            <span>Resumes</span>
            <span>Templates</span>
            <span>Limit</span>
            <span>Applications</span>
            <span>Cost</span>
          </div>
          {tenantCandidateUsers.map((user) => {
            const userTemplates = tenantResumeTemplates.filter((template) => template.userId === user.id);
            const todayRunsForUser = resumeRuns.filter((run) => run.userId === user.id && run.generatedAt === today()).length;
            return (
              <div className="data-row tenant-usage" key={user.id}>
                <span><strong>{user.name}</strong><small>{user.email}</small></span>
                <span>{todayRunsForUser}</span>
                <span>{user.usage.resumeGenerations}</span>
                <span>{userTemplates.length}</span>
                <span>
                  <input
                    className="mini-input"
                    type="number"
                    min={1}
                    max={50}
                    value={templateLimitForUser(user, templateLimits)}
                    onChange={(event) => updateTemplateLimit(user.id, Number(event.target.value))}
                  />
                </span>
                <span>{user.usage.jobApplications}</span>
                <span>{cents(user.usage.costCents)}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={History} title="Recent Resume Runs" />
        <div className="data-table">
          <div className="data-row resume-run-row header">
            <span>Candidate</span>
            <span>Template</span>
            <span>Resume</span>
            <span>Date</span>
            <span>Format</span>
          </div>
          {tenantResumeRuns.map((run) => {
            const owner = users.find((user) => user.id === run.userId);
            return (
              <div className="data-row resume-run-row" key={run.id}>
                <span><strong>{owner?.name || run.userId}</strong><small>{owner?.email}</small></span>
                <span>{run.templateName}</span>
                <span><strong>{run.fullName}</strong><small>{run.targetTitle}</small></span>
                <span>{run.generatedAt}</span>
                <span><Pill tone={run.outputFormat === "docx" ? "blue" : "green"}>{run.outputFormat}</Pill></span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );

  const templateEditorPanel = editingTemplate && adminDraftInput ? (
    <section className="panel">
      <SectionTitle icon={LockKeyhole} title={`Admin Update: ${editingTemplate.name}`} />
      <div className="form-grid compact">
        <label>
          <span>Name</span>
          <input value={adminDraftInput.fullName} onChange={(event) => updateAdminInput("fullName", event.target.value)} />
        </label>
        <label>
          <span>Job title</span>
          <input value={adminDraftInput.jobTitle} onChange={(event) => updateAdminInput("jobTitle", event.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input value={adminDraftInput.email} onChange={(event) => updateAdminInput("email", event.target.value)} />
        </label>
        <label>
          <span>Phone</span>
          <input value={adminDraftInput.phone} onChange={(event) => updateAdminInput("phone", event.target.value)} />
        </label>
        <label className="full">
          <span>LinkedIn</span>
          <input value={adminDraftInput.linkedin} onChange={(event) => updateAdminInput("linkedin", event.target.value)} />
        </label>
      </div>
      <div className="client-input-list">
        {adminDraftInput.clients.map((client, index) => (
          <div className="client-input-row" key={client.id}>
            <strong>Client {index + 1}</strong>
            <input value={client.clientName} onChange={(event) => updateAdminClient(index, "clientName", event.target.value)} />
            <input value={client.location} onChange={(event) => updateAdminClient(index, "location", event.target.value)} />
            <input value={client.timeline} onChange={(event) => updateAdminClient(index, "timeline", event.target.value)} />
            <input value={client.jobTitle} onChange={(event) => updateAdminClient(index, "jobTitle", event.target.value)} />
            <button
              className="icon-button"
              onClick={() => removeAdminClient(index)}
              disabled={adminDraftInput.clients.length <= 1}
              aria-label={`Remove Saved Client ${index + 1}`}
              title="Remove saved client section"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="toolbar-line">
        <button className="icon-button text" onClick={saveAdminTemplateUpdate}>
          <BadgeCheck size={17} />
          Save Admin Update
        </button>
        <button className="icon-button text" onClick={() => {
          setEditingTemplateId("");
          setAdminDraftInput(null);
        }}>
          <History size={17} />
          Cancel
        </button>
      </div>
    </section>
  ) : null;

  const templatesPanel = (
    <>
      <section className="panel">
        <SectionTitle icon={FileText} title="Template Requests" />
        <div className="data-table">
          <div className="data-row template-admin-row header">
            <span>Candidate</span>
            <span>Template</span>
            <span>Clients</span>
            <span>Runs</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {tenantResumeTemplates.map((template) => {
            const owner = users.find((user) => user.id === template.userId);
            const templateRuns = resumeRuns.filter((run) => run.templateId === template.id);
            return (
              <div className="data-row template-admin-row" key={template.id}>
                <span><strong>{owner?.name || template.userId}</strong><small>{owner?.email}</small></span>
                <span><strong>{template.name}</strong><small>{template.input.jobTitle}</small></span>
                <span>{template.input.clients.map((client) => client.clientName).filter(Boolean).join(", ") || "No clients yet"}</span>
                <span>{templateRuns.length}</span>
                <span><Pill tone={templateStatusTone(template.status)}>{template.status}</Pill></span>
                <span className="row-actions">
                  <button className="icon-button text" onClick={() => startTemplateEdit(template)}>
                    <FileText size={15} />
                    Edit
                  </button>
                  <button className="icon-button text" onClick={() => deleteTemplate(template.id)}>
                    <Trash2 size={15} />
                    Delete
                  </button>
                </span>
                {template.changeRequest ? <span className="template-request full-row">Request: {template.changeRequest}</span> : null}
              </div>
            );
          })}
        </div>
      </section>
      {templateEditorPanel}
    </>
  );

  if (view === "tenant-candidates") {
    return <div className="screen-stack">{candidatesPanel}</div>;
  }
  if (view === "tenant-templates") {
    return <div className="screen-stack">{templatesPanel}</div>;
  }
  if (view === "tenant-usage") {
    return <div className="screen-stack">{usagePanel}</div>;
  }

  return <div className="screen-stack">{overviewPanel}</div>;
}

function listToInput(values: string[]) {
  return values.join(", ");
}

function inputToList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function CandidateProfilePanel({
  profile,
  setProfile
}: {
  profile: CandidateApplicationProfile;
  setProfile: (profile: CandidateApplicationProfile) => void;
}) {
  function update<K extends keyof CandidateApplicationProfile>(key: K, value: CandidateApplicationProfile[K]) {
    setProfile({ ...profile, [key]: value, updatedAt: today() });
  }

  return (
    <section className="panel full-width">
      <SectionTitle icon={FileCheck2} title="Candidate Primary Details for Applications" />
      <div className="form-grid candidate-profile-grid">
        <label>
          <span>Legal name</span>
          <input value={profile.legalName} onChange={(event) => update("legalName", event.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input value={profile.email} onChange={(event) => update("email", event.target.value)} />
        </label>
        <label>
          <span>Phone</span>
          <input value={profile.phone} onChange={(event) => update("phone", event.target.value)} />
        </label>
        <label>
          <span>LinkedIn</span>
          <input value={profile.linkedin} onChange={(event) => update("linkedin", event.target.value)} />
        </label>
        <label>
          <span>Current location</span>
          <input value={profile.currentLocation} onChange={(event) => update("currentLocation", event.target.value)} />
        </label>
        <label>
          <span>Work authorization</span>
          <select value={profile.workAuthorization} onChange={(event) => update("workAuthorization", event.target.value as CandidateApplicationProfile["workAuthorization"])}>
            <option>US Citizen</option>
            <option>Green Card</option>
            <option>H1B</option>
            <option>OPT</option>
            <option>CPT</option>
            <option>EAD</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          <span>Expected rate</span>
          <input value={profile.expectedRate} onChange={(event) => update("expectedRate", event.target.value)} />
        </label>
        <label>
          <span>Availability</span>
          <input value={profile.availability} onChange={(event) => update("availability", event.target.value)} />
        </label>
        <label>
          <span>Target job titles</span>
          <input value={listToInput(profile.jobTitles)} onChange={(event) => update("jobTitles", inputToList(event.target.value))} />
        </label>
        <label>
          <span>Target locations</span>
          <input value={listToInput(profile.targetLocations)} onChange={(event) => update("targetLocations", inputToList(event.target.value))} />
        </label>
        <label>
          <span>Matching keywords</span>
          <input value={listToInput(profile.keywords)} onChange={(event) => update("keywords", inputToList(event.target.value))} />
        </label>
        <label>
          <span>Blocked words</span>
          <input value={listToInput(profile.blocklistedWords)} onChange={(event) => update("blocklistedWords", inputToList(event.target.value))} />
        </label>
      </div>
      <div className="profile-note">
        New application questions are saved here after they are filled once, then reused for future connector-prepared applications.
      </div>
    </section>
  );
}

function templateLimitForUser(user: PortalUser, templateLimits: TemplateLimitMap) {
  if (user.role === "INDIVIDUAL_CANDIDATE") {
    return templateLimits[user.id] ?? 8;
  }
  return templateLimits[user.id] ?? DEFAULT_TEMPLATE_LIMIT;
}

function cloneResumeInput(input: CandidateResumeInput): CandidateResumeInput {
  return {
    ...input,
    clients: input.clients.map((client) => ({ ...client }))
  };
}

function normalizeTemplateValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function templateInputKey(input: CandidateResumeInput, includeJobTitles = true) {
  return JSON.stringify({
    fullName: normalizeTemplateValue(input.fullName),
    jobTitle: includeJobTitles ? normalizeTemplateValue(input.jobTitle) : "",
    email: normalizeTemplateValue(input.email),
    phone: normalizeTemplateValue(input.phone),
    linkedin: normalizeTemplateValue(input.linkedin),
    clients: input.clients.map((client) => ({
      clientName: normalizeTemplateValue(client.clientName),
      location: normalizeTemplateValue(client.location),
      timeline: normalizeTemplateValue(client.timeline),
      jobTitle: includeJobTitles ? normalizeTemplateValue(client.jobTitle) : ""
    }))
  });
}

function sameTemplateInput(left: CandidateResumeInput, right: CandidateResumeInput, includeJobTitles = true) {
  return templateInputKey(left, includeJobTitles) === templateInputKey(right, includeJobTitles);
}

function applyCandidateJobTitleChanges(templateInput: CandidateResumeInput, candidateInput: CandidateResumeInput) {
  return {
    ...cloneResumeInput(templateInput),
    jobTitle: candidateInput.jobTitle,
    clients: templateInput.clients.map((client, index) => ({
      ...client,
      jobTitle: candidateInput.clients[index]?.jobTitle ?? client.jobTitle
    }))
  };
}

function templateStatusTone(status: CandidateResumeInputTemplate["status"]): "green" | "amber" | "blue" {
  if (status === "change_requested" || status === "delete_requested") {
    return "amber";
  }
  if (status === "admin_updated") {
    return "blue";
  }
  return "green";
}

function dedupeResumeTemplates(templates: CandidateResumeInputTemplate[]) {
  const merged = new Map<string, CandidateResumeInputTemplate>();

  templates.forEach((template) => {
    const key = `${template.userId}:${template.tenantId || "individual"}:${templateInputKey(template.input)}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, template);
      return;
    }

    merged.set(key, {
      ...existing,
      resumeCount: existing.resumeCount + template.resumeCount,
      lastUsedAt: existing.lastUsedAt || template.lastUsedAt,
      updatedAt: existing.updatedAt > template.updatedAt ? existing.updatedAt : template.updatedAt,
      status: existing.status === "active" ? template.status : existing.status,
      changeRequest: existing.changeRequest || template.changeRequest
    });
  });

  return Array.from(merged.values());
}

function CandidateTemplatePanel({
  currentUser,
  templates,
  setTemplates,
  templateLimits,
  resumeRuns,
  currentInput,
  onCurrentInputChange,
  onGenerateTemplate
}: {
  currentUser: PortalUser;
  templates: CandidateResumeInputTemplate[];
  setTemplates: (templates: CandidateResumeInputTemplate[]) => void;
  templateLimits: TemplateLimitMap;
  resumeRuns: ResumeRunRecord[];
  currentInput: CandidateResumeInput;
  onCurrentInputChange: (input: CandidateResumeInput) => void;
  onGenerateTemplate: (input: CandidateResumeInput, template?: CandidateResumeInputTemplate) => Promise<void>;
}) {
  const userTemplates = templates.filter((template) => template.userId === currentUser.id);
  const activeTemplateCount = userTemplates.length;
  const templateLimit = templateLimitForUser(currentUser, templateLimits);
  const [draftInput, setDraftInput] = useState<CandidateResumeInput>(currentInput);
  const [templateName, setTemplateName] = useState("Subbareddy Workday Input");
  const [selectedTemplateId, setSelectedTemplateId] = useState(userTemplates[0]?.id || "");
  const [changeRequest, setChangeRequest] = useState("");
  const [templateNotice, setTemplateNotice] = useState("");
  const selectedTemplate = userTemplates.find((template) => template.id === selectedTemplateId);
  const todayRuns = resumeRuns.filter((run) => run.userId === currentUser.id && run.generatedAt === today()).length;

  function setCurrentDraft(input: CandidateResumeInput) {
    const next = cloneResumeInput(input);
    setDraftInput(next);
    onCurrentInputChange(next);
  }

  function updateInput<K extends keyof Omit<CandidateResumeInput, "clients">>(key: K, value: CandidateResumeInput[K]) {
    const next = { ...draftInput, [key]: value } as CandidateResumeInput;
    setCurrentDraft(next);
  }

  function updateClient(index: number, key: keyof ResumeClientInput, value: string) {
    const clients = draftInput.clients.map((client, clientIndex) => (
      clientIndex === index ? { ...client, [key]: value } : client
    ));
    const next = { ...draftInput, clients };
    setCurrentDraft(next);
  }

  function addClient() {
    const next = {
      ...draftInput,
      clients: [
        ...draftInput.clients,
        {
          id: `client-${Date.now()}`,
          clientName: "",
          location: "",
          timeline: "",
          jobTitle: draftInput.jobTitle
        }
      ]
    };
    setCurrentDraft(next);
  }

  function removeClient(index: number) {
    if (draftInput.clients.length <= 1) {
      return;
    }
    const next = {
      ...draftInput,
      clients: draftInput.clients.filter((_, clientIndex) => clientIndex !== index)
    };
    setCurrentDraft(next);
  }

  function saveTemplateFromDraft() {
    const exactTemplate = userTemplates.find((template) => sameTemplateInput(template.input, draftInput));
    if (exactTemplate) {
      setSelectedTemplateId(exactTemplate.id);
      setTemplateName(exactTemplate.name);
      setTemplateNotice("Matching saved template already exists, so no duplicate was added.");
      return;
    }

    const jobTitleCompatibleTemplate = userTemplates.find((template) => sameTemplateInput(template.input, draftInput, false));
    if (jobTitleCompatibleTemplate) {
      setTemplates(templates.map((template) => template.id === jobTitleCompatibleTemplate.id ? {
        ...template,
        input: applyCandidateJobTitleChanges(template.input, draftInput),
        status: "active",
        updatedAt: today()
      } : template));
      setSelectedTemplateId(jobTitleCompatibleTemplate.id);
      setTemplateName(jobTitleCompatibleTemplate.name);
      setTemplateNotice("Only job titles changed, so the existing template was updated without using another template slot.");
      return;
    }

    if (activeTemplateCount >= templateLimit || !draftInput.fullName.trim() || !templateName.trim()) {
      setTemplateNotice("Template was not saved. Check the template name, candidate name, or ask company admin to raise the limit.");
      return;
    }

    const newTemplate: CandidateResumeInputTemplate = {
      id: `resume-template-${Date.now()}`,
      userId: currentUser.id,
      tenantId: currentUser.tenantId,
      name: templateName.trim(),
      input: cloneResumeInput(draftInput),
      status: "active",
      createdAt: today(),
      updatedAt: today(),
      resumeCount: 0
    };
    setTemplates([newTemplate, ...templates]);
    setSelectedTemplateId(newTemplate.id);
    setTemplateNotice("Saved as a new input template.");
  }

  function saveNewTemplate() {
    saveTemplateFromDraft();
  }

  function useTemplate(template: CandidateResumeInputTemplate) {
    const next = cloneResumeInput(template.input);
    setSelectedTemplateId(template.id);
    setCurrentDraft(next);
    setTemplateName(template.name);
    setTemplateNotice("Template loaded. Job title fields can be changed directly; other saved-template changes need admin approval.");
  }

  function requestAdminUpdate() {
    if (!selectedTemplate || !changeRequest.trim()) {
      return;
    }
    setTemplates(templates.map((template) => template.id === selectedTemplate.id ? {
      ...template,
      status: "change_requested",
      changeRequest: changeRequest.trim(),
      updatedAt: today()
    } : template));
    setChangeRequest("");
    setTemplateNotice("Update request sent to company admin.");
  }

  function requestTemplateDelete(template: CandidateResumeInputTemplate) {
    setSelectedTemplateId(template.id);
    setTemplates(templates.map((item) => item.id === template.id ? {
      ...item,
      status: "delete_requested",
      changeRequest: `Delete template requested by ${currentUser.name}.`,
      updatedAt: today()
    } : item));
    setTemplateNotice("Delete request sent to company admin.");
  }

  return (
    <section className="panel full-width">
      <SectionTitle
        icon={FileCheck2}
        title="Resume Input Templates"
        action={<Pill tone={activeTemplateCount >= templateLimit ? "red" : "green"}>{activeTemplateCount}/{templateLimit} active</Pill>}
      />
      <div className="template-metrics">
        <article><strong>{todayRuns}</strong><span>resumes created today</span></article>
        <article><strong>{userTemplates.length}</strong><span>saved input templates</span></article>
        <article><strong>Admin delete</strong><span>remove saved templates by request</span></article>
      </div>
      {templateNotice ? <div className="profile-note">{templateNotice}</div> : null}

      <div className="dashboard-layout template-builder-layout">
        <div className="screen-stack">
          <div className="panel subtle-panel">
            <SectionTitle icon={FileText} title="Structured Resume Input" />
            <div className="form-grid compact">
              <label>
                <span>Name</span>
                <input value={draftInput.fullName} onChange={(event) => updateInput("fullName", event.target.value)} />
              </label>
              <label>
                <span>Job title</span>
                <input value={draftInput.jobTitle} onChange={(event) => updateInput("jobTitle", event.target.value)} />
              </label>
              <label>
                <span>Email</span>
                <input value={draftInput.email} onChange={(event) => updateInput("email", event.target.value)} />
              </label>
              <label>
                <span>Phone</span>
                <input value={draftInput.phone} onChange={(event) => updateInput("phone", event.target.value)} />
              </label>
              <label className="full">
                <span>LinkedIn</span>
                <input value={draftInput.linkedin} onChange={(event) => updateInput("linkedin", event.target.value)} />
              </label>
            </div>
            <div className="client-input-list">
              {draftInput.clients.map((client, index) => (
                <div className="client-input-row" key={client.id}>
                  <strong>Client {index + 1}</strong>
                  <input placeholder="Client" value={client.clientName} onChange={(event) => updateClient(index, "clientName", event.target.value)} />
                  <input placeholder="Location" value={client.location} onChange={(event) => updateClient(index, "location", event.target.value)} />
                  <input placeholder="Timeline" value={client.timeline} onChange={(event) => updateClient(index, "timeline", event.target.value)} />
                  <input placeholder="Job title" value={client.jobTitle} onChange={(event) => updateClient(index, "jobTitle", event.target.value)} />
                  <button
                    className="icon-button"
                    onClick={() => removeClient(index)}
                    disabled={draftInput.clients.length <= 1}
                    aria-label={`Remove Client ${index + 1}`}
                    title="Remove unsaved client section"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="toolbar-line">
              <button className="icon-button text" onClick={addClient}>
                <Plus size={17} />
                Add Client
              </button>
              <button className="icon-button text" onClick={() => onGenerateTemplate(draftInput)}>
                <WandSparkles size={17} />
                Generate From Current Input
              </button>
            </div>
          </div>
        </div>

        <div className="screen-stack">
          <div className="panel subtle-panel">
            <SectionTitle icon={Library} title="Save New Template" />
            <label className="stacked">
              <span>Template name</span>
              <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
            </label>
            <button className="icon-button text" onClick={saveNewTemplate}>
              <Plus size={17} />
              Save / Update Input Template
            </button>
            {activeTemplateCount >= templateLimit ? (
              <div className="profile-note">Template limit reached. Ask your company admin to raise the active template limit.</div>
            ) : (
              <div className="profile-note">Generating from structured input auto-saves it. Saved templates are locked except job titles; deletion requires company admin.</div>
            )}
          </div>

          <div className="template-card-list">
            {userTemplates.map((template) => (
              <article key={template.id} className={template.id === selectedTemplateId ? "selected" : ""}>
                <div>
                  <strong>{template.name}</strong>
                  <Pill tone={templateStatusTone(template.status)}>{template.status}</Pill>
                </div>
                <span>{template.input.fullName} | {template.input.jobTitle}</span>
                <small>{template.input.clients.length} clients | {template.resumeCount} resumes | updated {template.updatedAt}</small>
                <div className="row-actions">
                  <button className="icon-button text" onClick={() => useTemplate(template)}>
                    <FileText size={15} />
                    Use
                  </button>
                  <button className="icon-button text" onClick={() => onGenerateTemplate(template.input, template)}>
                    <WandSparkles size={15} />
                    Generate
                  </button>
                  <button className="icon-button text" onClick={() => requestTemplateDelete(template)} disabled={template.status === "delete_requested"}>
                    <Trash2 size={15} />
                    Request Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          {selectedTemplate ? (
            <div className="panel subtle-panel">
              <SectionTitle icon={LockKeyhole} title="Request Admin Update" />
              <label className="stacked">
                <span>What should company admin change?</span>
                <textarea value={changeRequest} onChange={(event) => setChangeRequest(event.target.value)} />
              </label>
              <button className="icon-button text" onClick={requestAdminUpdate}>
                <Mail size={17} />
                Send Update Request
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CandidateDesk({
  currentUser,
  users,
  setUsers,
  ledger,
  setLedger,
  candidateProfiles,
  setCandidateProfiles,
  resumeTemplates,
  setResumeTemplates,
  templateLimits,
  resumeRuns,
  setResumeRuns,
  result,
  setResult,
  apiTenantId
}: {
  currentUser: PortalUser;
  users: PortalUser[];
  setUsers: (users: PortalUser[]) => void;
  ledger: BillingLedgerItem[];
  setLedger: (items: BillingLedgerItem[]) => void;
  candidateProfiles: CandidateApplicationProfile[];
  setCandidateProfiles: (profiles: CandidateApplicationProfile[]) => void;
  resumeTemplates: CandidateResumeInputTemplate[];
  setResumeTemplates: (templates: CandidateResumeInputTemplate[]) => void;
  templateLimits: TemplateLimitMap;
  resumeRuns: ResumeRunRecord[];
  setResumeRuns: (runs: ResumeRunRecord[]) => void;
  result: ResumeGenerationResult | null;
  setResult: (result: ResumeGenerationResult | null) => void;
  apiTenantId: string | null;
}) {
  const candidateProfile = candidateProfiles.find((profile) => profile.userId === currentUser.id) || buildDefaultProfileForUser(currentUser);
  const [currentStructuredInput, setCurrentStructuredInput] = useState<CandidateResumeInput>(createSubbareddySampleInput);
  const [form, setForm] = useState<ResumeGenerationRequest>({
    ...INITIAL_FORM,
    fullName: candidateProfile.legalName || currentUser.name,
    email: candidateProfile.email || currentUser.email,
    phone: candidateProfile.phone || INITIAL_FORM.phone,
    linkedin: candidateProfile.linkedin || INITIAL_FORM.linkedin,
    targetTitle: candidateProfile.jobTitles[0] || currentUser.title
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResumeInput, setActiveResumeInput] = useState<CandidateResumeInput | null>(null);
  const [generationNotice, setGenerationNotice] = useState("");

  function updateUsage(costCents: number) {
    setUsers(users.map((user) => {
      if (user.id !== currentUser.id) {
        return user;
      }
      return {
        ...user,
        usage: {
          ...user.usage,
          resumeGenerations: user.usage.resumeGenerations + 1,
          tokensUsed: user.usage.tokensUsed + 6800,
          costCents: user.usage.costCents + costCents
        }
      };
    }));

    if (currentUser.role === "INDIVIDUAL_CANDIDATE") {
      setLedger([
        {
          id: `bill-${Date.now()}`,
          userId: currentUser.id,
          label: "Resume generation",
          units: 1,
          amountCents: costCents,
          status: "open",
          createdAt: today()
        },
        ...ledger
      ]);
    }
  }

  async function generate() {
    await generateFromTemplate(currentStructuredInput);
  }

  async function generateFromTemplate(input: CandidateResumeInput, template?: CandidateResumeInputTemplate) {
    const nextForm: ResumeGenerationRequest = {
      ...form,
      fullName: input.fullName,
      targetTitle: input.jobTitle,
      email: input.email,
      phone: input.phone,
      linkedin: input.linkedin,
      strategy: "recruiter-readable",
      resumeText: buildResumeSourceText(input)
    };
    setForm(nextForm);
    setActiveResumeInput(cloneResumeInput(input));
    setLoading(true);
    setError(null);
    setGenerationNotice("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...apiTenantHeaders(apiTenantId) },
        body: JSON.stringify(nextForm)
      });
      const payload = await response.json();
      const resultPayload = unwrapResumeGeneration(payload);
      setResult({
        ...resultPayload,
        resumeMarkdown: buildFormattedResumePlainText(input)
      });
      const resumeId = `resume-${Date.now()}`;
      const userTemplates = resumeTemplates.filter((item) => item.userId === currentUser.id);
      const templateLimit = templateLimitForUser(currentUser, templateLimits);
      const exactTemplate = template || userTemplates.find((item) => sameTemplateInput(item.input, input));
      const jobTitleCompatibleTemplate = exactTemplate ? undefined : userTemplates.find((item) => sameTemplateInput(item.input, input, false));
      let generatedTemplate = exactTemplate || jobTitleCompatibleTemplate;
      let nextTemplates = resumeTemplates;

      if (exactTemplate) {
        nextTemplates = resumeTemplates.map((item) => item.id === exactTemplate.id ? {
          ...item,
          lastUsedAt: today(),
          resumeCount: item.resumeCount + 1
        } : item);
        setGenerationNotice(template ? "Resume generated from saved template." : "Resume generated. Matching saved template was reused, so no duplicate was added.");
      } else if (jobTitleCompatibleTemplate) {
        generatedTemplate = {
          ...jobTitleCompatibleTemplate,
          input: applyCandidateJobTitleChanges(jobTitleCompatibleTemplate.input, input),
          lastUsedAt: today(),
          resumeCount: jobTitleCompatibleTemplate.resumeCount + 1,
          status: "active",
          updatedAt: today()
        };
        nextTemplates = resumeTemplates.map((item) => item.id === jobTitleCompatibleTemplate.id ? generatedTemplate as CandidateResumeInputTemplate : item);
        setGenerationNotice("Resume generated. Only job titles changed, so the saved template was updated without creating a duplicate.");
      } else if (userTemplates.length < templateLimit && input.fullName.trim()) {
        generatedTemplate = {
          id: `resume-template-${Date.now()}`,
          userId: currentUser.id,
          tenantId: currentUser.tenantId,
          name: `${input.fullName.trim()} ${input.jobTitle.trim() || "Resume"} Input`,
          input: cloneResumeInput(input),
          status: "active",
          createdAt: today(),
          updatedAt: today(),
          lastUsedAt: today(),
          resumeCount: 1
        };
        nextTemplates = [generatedTemplate, ...resumeTemplates];
        setGenerationNotice("Resume generated and saved as a new input template.");
      } else {
        setGenerationNotice("Resume generated, but the input was not saved because the template limit is reached or the candidate name is missing.");
      }

      setResumeRuns([
        {
          id: `run-${Date.now()}`,
          userId: currentUser.id,
          tenantId: currentUser.tenantId,
          templateId: generatedTemplate?.id,
          templateName: generatedTemplate?.name || "Current unsaved input",
          fullName: input.fullName,
          targetTitle: input.jobTitle,
          generatedAt: today(),
          resumeId,
          outputFormat: "draft"
        },
        ...resumeRuns
      ]);
      if (nextTemplates !== resumeTemplates) {
        setResumeTemplates(nextTemplates);
      }
      updateUsage(190);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadFormattedDocx() {
    if (!activeResumeInput) {
      return;
    }
    const response = await fetch("/api/resume-docx", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...apiTenantHeaders(apiTenantId) },
      body: JSON.stringify({ input: activeResumeInput })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(payload?.error?.message ?? "DOCX export failed.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeResumeInput.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "resume"}-resume.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
    setResumeRuns([
      {
        id: `run-${Date.now()}`,
        userId: currentUser.id,
        tenantId: currentUser.tenantId,
        templateName: "DOCX export",
        fullName: activeResumeInput.fullName,
        targetTitle: activeResumeInput.jobTitle,
        generatedAt: today(),
        resumeId: `docx-${Date.now()}`,
        outputFormat: "docx"
      },
      ...resumeRuns
    ]);
  }

  return (
    <div className="studio-grid">
      <CandidateProfilePanel
        profile={candidateProfile}
        setProfile={(profile) => {
          const exists = candidateProfiles.some((item) => item.userId === profile.userId);
          setCandidateProfiles(exists ? candidateProfiles.map((item) => item.userId === profile.userId ? profile : item) : [profile, ...candidateProfiles]);
          setForm({
            ...form,
            fullName: profile.legalName,
            email: profile.email,
            phone: profile.phone,
            linkedin: profile.linkedin,
            targetTitle: profile.jobTitles[0] || form.targetTitle
          });
        }}
      />
      <CandidateTemplatePanel
        currentUser={currentUser}
        templates={resumeTemplates}
        setTemplates={setResumeTemplates}
        templateLimits={templateLimits}
        resumeRuns={resumeRuns}
        currentInput={currentStructuredInput}
        onCurrentInputChange={setCurrentStructuredInput}
        onGenerateTemplate={generateFromTemplate}
      />
      <section className="panel input-panel">
        <SectionTitle
          icon={Upload}
          title="Resume Generation"
          action={
            <button className="icon-button text" onClick={generate} disabled={loading}>
              {loading ? <RefreshCw className="spin" size={17} /> : <WandSparkles size={17} />}
              {loading ? "Generating" : "Generate"}
            </button>
          }
        />
        {error ? <div className="error-banner">{error}</div> : null}
        {generationNotice ? <div className="profile-note">{generationNotice}</div> : null}
        <div className="source-summary">
          <strong>{currentStructuredInput.fullName || "Structured input"}</strong>
          <span>{currentStructuredInput.jobTitle || "Target title comes from structured input"}</span>
          <small>{currentStructuredInput.email || currentUser.email} | {currentStructuredInput.clients.length} client sections | recruiter-readable</small>
        </div>
        <label className="stacked">
          <span>Job description</span>
          <textarea value={form.jobDescription} onChange={(event) => setForm({ ...form, jobDescription: event.target.value })} />
        </label>
      </section>

      <section className="panel result-panel">
        <SectionTitle
          icon={FileText}
          title="Resume Draft and Scores"
          action={
            <button
              className="icon-button"
              disabled={!result || !activeResumeInput}
              onClick={downloadFormattedDocx}
              title="Download formatted DOCX"
            >
              <Download size={17} />
            </button>
          }
        />
        {result ? (
          <div className="result-stack">
            <div className="result-summary">
              <Pill tone="green">{result.role}</Pill>
              <Pill tone="blue">{result.domain}</Pill>
              <Pill tone="amber">{result.costGovernance.estimatedSavingsPercent}% savings</Pill>
            </div>
            <div className="score-list two-col">
              <ScoreBar label="ATS" value={result.scores.ats} />
              <ScoreBar label="Realism" value={result.scores.humanRealism} />
              <ScoreBar label="Domain" value={result.scores.domainAuthenticity} />
              <ScoreBar label="Timeline" value={result.scores.timelineIntegrity} />
            </div>
            <div className="resume-preview">
              <pre>{result.resumeMarkdown}</pre>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={26} />
            <strong>Generate a controlled resume draft.</strong>
            <span>Usage is metered to the user and tenant account.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function JobsAndApplications({
  currentUser,
  users,
  setUsers,
  candidateProfiles,
  setCandidateProfiles,
  syncedRoles,
  setSyncedRoles,
  appliedRoles,
  setAppliedRoles,
  result,
  apiTenantId
}: {
  currentUser: PortalUser;
  users: PortalUser[];
  setUsers: (users: PortalUser[]) => void;
  candidateProfiles: CandidateApplicationProfile[];
  setCandidateProfiles: (profiles: CandidateApplicationProfile[]) => void;
  syncedRoles: SyncedRole[];
  setSyncedRoles: (roles: SyncedRole[]) => void;
  appliedRoles: AppliedRoleRecord[];
  setAppliedRoles: (records: AppliedRoleRecord[]) => void;
  result: ResumeGenerationResult | null;
  apiTenantId: string | null;
}) {
  const profile = candidateProfiles.find((item) => item.userId === currentUser.id) || buildDefaultProfileForUser(currentUser);
  const [syncCycle, setSyncCycle] = useState(0);
  const [lastSync, setLastSync] = useState<string>("Not synced yet");
  const visibleRoles = syncedRoles.filter((role) => role.id.startsWith(`${profile.userId}-`));
  const [dbJobs, setDbJobs] = useState<JobsApiData["jobs"]>([]);
  const [dbApplications, setDbApplications] = useState<ApplicationRecord[]>([]);
  const [serverIndexError, setServerIndexError] = useState<string | null>(null);
  const [serverIndexLoading, setServerIndexLoading] = useState(false);
  const [prepareApiError, setPrepareApiError] = useState<string | null>(null);
  const [jobSearchInput, setJobSearchInput] = useState("");
  const [jobDomainInput, setJobDomainInput] = useState("");

  async function loadServerJobIndex(q: string, domain: string) {
    setServerIndexError(null);
    setPrepareApiError(null);
    setServerIndexLoading(true);
    try {
      const params = new URLSearchParams({ q, domain });
      const jobsData = await fetchApiEnvelope<JobsApiData>(`/api/jobs?${params}`, {
        headers: { ...apiTenantHeaders(apiTenantId) }
      });
      setDbJobs(jobsData.jobs);
      const apps = await fetchApiEnvelope<ApplicationRecord[]>("/api/applications", {
        headers: { ...apiTenantHeaders(apiTenantId) }
      });
      setDbApplications(apps);
    } catch (err) {
      setServerIndexError(err instanceof Error ? err.message : "Unable to load jobs or applications from the API.");
    } finally {
      setServerIndexLoading(false);
    }
  }

  function saveProfile(profileUpdate: CandidateApplicationProfile) {
    const exists = candidateProfiles.some((item) => item.userId === profileUpdate.userId);
    setCandidateProfiles(exists ? candidateProfiles.map((item) => item.userId === profileUpdate.userId ? profileUpdate : item) : [profileUpdate, ...candidateProfiles]);
  }

  function syncConnectorDemo() {
    const nextRoles = syncJobsForCandidate(profile, syncedRoles, syncCycle);
    setSyncedRoles(nextRoles);
    setSyncCycle(syncCycle + 1);
    setLastSync(new Date().toLocaleTimeString());
  }

  function refreshJobs() {
    syncConnectorDemo();
    void loadServerJobIndex(jobSearchInput.trim(), jobDomainInput.trim());
  }

  useEffect(() => {
    setJobSearchInput("");
    setJobDomainInput("");
    void loadServerJobIndex("", "");
  }, [apiTenantId]);

  useEffect(() => {
    if (!candidateProfiles.some((item) => item.userId === currentUser.id)) {
      setCandidateProfiles([profile, ...candidateProfiles]);
    }
  }, [candidateProfiles, currentUser.id, profile, setCandidateProfiles]);

  useEffect(() => {
    syncConnectorDemo();
    const interval = window.setInterval(() => {
      const storedProfiles = JSON.parse(window.localStorage.getItem("lp-candidate-profiles") || "[]") as CandidateApplicationProfile[];
      const latestProfile = storedProfiles.find((item) => item.userId === currentUser.id) || profile;
      const storedRoles = JSON.parse(window.localStorage.getItem("lp-synced-roles") || "[]") as SyncedRole[];
      const nextRoles = syncJobsForCandidate(latestProfile, storedRoles, Date.now());
      setSyncedRoles(nextRoles);
      setLastSync(new Date().toLocaleTimeString());
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  function toggleConnector(name: string, status: ConnectorStatus) {
    saveProfile({
      ...profile,
      connectorStatuses: {
        ...profile.connectorStatuses,
        [name]: status
      },
      updatedAt: today()
    });
  }

  async function prepareApplication(role: SyncedRole) {
    setPrepareApiError(null);
    const record = createAppliedRoleRecord({
      userId: currentUser.id,
      role,
      profile,
      resume: result
    });
    setAppliedRoles([record, ...appliedRoles]);
    setSyncedRoles(syncedRoles.map((item) => (item.id === role.id ? { ...item, status: "prepared" } : item)));
    setUsers(
      users.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              usage: {
                ...user.usage,
                jobApplications: user.usage.jobApplications + 1
              }
            }
          : user
      )
    );

    const catalogJobId = matchSyncedRoleToCatalogJobId(role);
    if (!catalogJobId) {
      setPrepareApiError(
        "This demo role does not match a seeded catalog job — prepared locally only. Add a matching row in JOB_LISTINGS to persist to Postgres."
      );
      return;
    }
    const resumeLegacy = pickSeededResumeLegacyId(profile.primaryResumeId);
    try {
      await fetchApiEnvelope<ApplicationRecord>("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...apiTenantHeaders(apiTenantId)
        },
        body: JSON.stringify({
          jobId: catalogJobId,
          resumeId: resumeLegacy,
          status: "Saved"
        })
      });
      await loadServerJobIndex(jobSearchInput.trim(), jobDomainInput.trim());
    } catch (err) {
      setPrepareApiError(err instanceof Error ? err.message : "Could not save application to the database.");
    }
  }

  return (
    <div className="screen-stack">
      <section className="toolbar-line">
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search normalized jobs" value={profile.keywords.join(", ")} readOnly />
        </div>
        <button type="button" className="icon-button text" onClick={refreshJobs}>
          <RefreshCw size={17} />
          Refresh Now
        </button>
        <Pill tone="green">auto refresh every 1 minute</Pill>
        <Pill tone="blue">last sync: {lastSync}</Pill>
      </section>

      {prepareApiError ? <div className="error-banner">{prepareApiError}</div> : null}

      <section className="panel">
        <SectionTitle icon={DatabaseZap} title="Tenant job index (PostgreSQL)" />
        <p className="profile-note">
          Live search against seeded jobs in your tenant database. Connector cards below remain the deterministic demo sync.
        </p>
        {serverIndexError ? <div className="error-banner">{serverIndexError}</div> : null}
        {serverIndexLoading ? <p className="muted">Loading server index…</p> : null}
        <div className="toolbar-line">
          <label className="stacked">
            <span>Search index</span>
            <input
              value={jobSearchInput}
              onChange={(event) => setJobSearchInput(event.target.value)}
              placeholder="Title, company, location, domain"
            />
          </label>
          <label className="stacked">
            <span>Domain filter</span>
            <input
              value={jobDomainInput}
              onChange={(event) => setJobDomainInput(event.target.value)}
              placeholder="e.g. Technology"
            />
          </label>
          <button
            type="button"
            className="icon-button text"
            onClick={() => void loadServerJobIndex(jobSearchInput.trim(), jobDomainInput.trim())}
          >
            <Search size={17} />
            Search index
          </button>
        </div>
        <div className="job-grid">
          {dbJobs.slice(0, 12).map((job) => (
            <article className="job-card" key={job.id}>
              <div>
                <Pill tone="blue">{job.source}</Pill>
                <Pill tone="green">{job.applyMode}</Pill>
              </div>
              <h3>{job.title}</h3>
              <p>
                {job.company} | {job.location}
              </p>
              <div className="job-skills">
                {job.skills.slice(0, 7).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
              <footer>
                <strong>{job.normalizedScore}% fit</strong>
                <small className="job-note">Posted {job.postedAt}</small>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={FileCheck2} title="Applications in database" />
        <p className="profile-note">Rows from `GET /api/applications` for your signed-in user (or full tenant for admins).</p>
        <div className="data-table apps">
          <div className="data-row header">
            <span>Job id</span>
            <span>Resume id</span>
            <span>Status</span>
            <span>ATS</span>
            <span>Applied</span>
          </div>
          {dbApplications.length === 0 ? (
            <div className="data-row">
              <span>No applications returned yet.</span>
            </div>
          ) : (
            dbApplications.slice(0, 20).map((row) => (
              <div className="data-row" key={row.id}>
                <span>
                  <strong className="truncate">{row.jobId}</strong>
                </span>
                <span>
                  <small>{row.resumeId}</small>
                </span>
                <span>
                  <Pill tone="amber">{row.status}</Pill>
                </span>
                <span>{row.atsScore}</span>
                <span>{row.appliedAt}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={Network} title="Portal Connector Preparation" />
        <div className="connector-explainer">
          <strong>These are setup states, not background timers.</strong>
          <span>
            Connected means the demo connector is allowed to refresh matched jobs here. Needs review means a human-approved browser or vendor workflow is required. Not connected means credentials or an approved connector account still need to be added before production sync.
          </span>
        </div>
        <div className="connector-grid">
          {JOB_PORTAL_CONNECTORS.map((connector) => {
            const status = profile.connectorStatuses[connector.name] || connector.status;
            return (
              <article key={connector.name}>
                <header>
                  <strong>{connector.name}</strong>
                  <Pill tone={status === "connected" ? "green" : status === "needs_review" ? "amber" : status === "rate_limited" ? "red" : "neutral"}>
                    {status}
                  </Pill>
                </header>
                <span>{connector.focus}</span>
                <small>{connector.authMode} | {connector.applyMode}</small>
                <p>{connector.setupAction}</p>
                <div className="row-actions">
                  <button className="icon-button" onClick={() => toggleConnector(connector.name, "connected")} title="Mark connected">
                    <CheckCircle2 size={15} />
                  </button>
                  <button className="icon-button" onClick={() => toggleConnector(connector.name, "needs_review")} title="Needs review">
                    <ShieldCheck size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="job-grid">
        {visibleRoles.filter((role) => role.status !== "excluded").slice(0, 12).map((role) => (
          <article className="job-card" key={role.id}>
            <div>
              <Pill tone="blue">{role.portal}</Pill>
              <Pill tone="green">{role.safeApplyMode}</Pill>
            </div>
            <h3>{role.title}</h3>
            <p>{role.company} | {role.location}</p>
            <div className="job-skills">
              {role.keywords.slice(0, 7).map((skill) => <span key={skill}>{skill}</span>)}
            </div>
            <footer>
              <strong>{role.matchScore}% match</strong>
              <button
                type="button"
                className="icon-button"
                onClick={() => void prepareApplication(role)}
                title="Prepare application"
              >
                <Link2 size={16} />
              </button>
            </footer>
            <small className="job-note">Matched: {role.matchedSignals.slice(0, 3).join(", ") || "verified DB fallback"}</small>
          </article>
        ))}
      </section>

      <section className="panel">
        <SectionTitle icon={Trash2} title="Excluded by Candidate Blocklist" />
        <div className="excluded-list">
          {visibleRoles.filter((role) => role.status === "excluded").map((role) => (
            <article key={role.id}>
              <strong>{role.title} at {role.company}</strong>
              <span>{role.portal} | blocked by {role.exclusionHits.join(", ")}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={Archive} title="Applied and Prepared Role Records" />
        <div className="data-table apps">
          <div className="data-row header">
            <span>Job</span>
            <span>Company</span>
            <span>Status</span>
            <span>Portal</span>
            <span>Resume</span>
            <span>Response</span>
          </div>
          {appliedRoles.filter((record) => record.userId === currentUser.id).map((record) => (
            <div className="data-row" key={record.id}>
              <span><strong>{record.title}</strong><small>{record.link}</small></span>
              <span>{record.companyName}</span>
              <span><Pill tone="amber">{record.status}</Pill></span>
              <span>{record.portal}</span>
              <span>{record.resumeId}</span>
              <span>{record.response || "No response yet"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TenantJobActivity({
  currentUser,
  users,
  candidateProfiles,
  syncedRoles,
  appliedRoles,
  apiTenantId
}: {
  currentUser: PortalUser;
  users: PortalUser[];
  candidateProfiles: CandidateApplicationProfile[];
  syncedRoles: SyncedRole[];
  appliedRoles: AppliedRoleRecord[];
  apiTenantId: string | null;
}) {
  const [tenantDbApplications, setTenantDbApplications] = useState<ApplicationRecord[]>([]);
  const [tenantAppsError, setTenantAppsError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setTenantAppsError(null);
      try {
        const apps = await fetchApiEnvelope<ApplicationRecord[]>("/api/applications", {
          headers: { ...apiTenantHeaders(apiTenantId) }
        });
        setTenantDbApplications(apps);
      } catch (err) {
        setTenantAppsError(err instanceof Error ? err.message : "Unable to load applications from the API.");
      }
    })();
  }, [apiTenantId]);
  const tenantId = currentUser.tenantId;
  const tenantCandidates = users.filter((user) =>
    user.tenantId === tenantId && (user.role === "TENANT_CANDIDATE" || user.role === "RECRUITER")
  );
  const tenantCandidateIds = new Set(tenantCandidates.map((user) => user.id));
  const tenantAppliedRoles = appliedRoles.filter((record) => tenantCandidateIds.has(record.userId));
  const tenantSyncedRoles = syncedRoles.filter((role) => tenantCandidates.some((candidate) => role.id.startsWith(`${candidate.id}-`)));
  const preparedCount = tenantAppliedRoles.filter((record) => record.status === "prepared").length;
  const appliedCount = tenantAppliedRoles.filter((record) => record.status === "applied").length;

  return (
    <div className="screen-stack">
      <section className="panel">
        <SectionTitle icon={FileCheck2} title="Applications in database (tenant scope)" />
        {tenantAppsError ? <div className="error-banner">{tenantAppsError}</div> : null}
        <p className="profile-note">Results from `GET /api/applications` for your tenant (admins see all rows).</p>
        <div className="data-table apps">
          <div className="data-row header">
            <span>User id</span>
            <span>Job id</span>
            <span>Status</span>
            <span>ATS</span>
            <span>Applied</span>
          </div>
          {tenantDbApplications.length === 0 ? (
            <div className="data-row">
              <span>No applications returned yet.</span>
            </div>
          ) : (
            tenantDbApplications.slice(0, 30).map((row) => (
              <div className="data-row" key={row.id}>
                <span>
                  <small>{row.userId}</small>
                </span>
                <span>
                  <strong className="truncate">{row.jobId}</strong>
                </span>
                <span>
                  <Pill tone="amber">{row.status}</Pill>
                </span>
                <span>{row.atsScore}</span>
                <span>{row.appliedAt}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label="Tracked Candidates" value={`${tenantCandidates.length}`} sublabel="company job-search users" icon={Users} />
        <MetricCard label="Matched Roles" value={`${tenantSyncedRoles.filter((role) => role.status !== "excluded").length}`} sublabel="candidate-filtered listings" icon={BriefcaseBusiness} tone="teal" />
        <MetricCard label="Prepared Apps" value={`${preparedCount}`} sublabel="ready for candidate review" icon={FileCheck2} tone="gold" />
        <MetricCard label="Applied" value={`${appliedCount}`} sublabel="submitted role records" icon={Archive} tone="coral" />
      </section>

      <section className="panel">
        <SectionTitle icon={Search} title="Candidate Job Profiles" />
        <div className="data-table">
          <div className="data-row tenant-job-profile-row header">
            <span>Candidate</span>
            <span>Target Titles</span>
            <span>Locations</span>
            <span>Keywords</span>
            <span>Matched</span>
          </div>
          {tenantCandidates.map((candidate) => {
            const profile = candidateProfiles.find((item) => item.userId === candidate.id);
            const matchedRoles = syncedRoles.filter((role) => role.id.startsWith(`${candidate.id}-`) && role.status !== "excluded").length;
            return (
              <div className="data-row tenant-job-profile-row" key={candidate.id}>
                <span><strong>{candidate.name}</strong><small>{candidate.email}</small></span>
                <span>{profile?.jobTitles.join(", ") || candidate.title}</span>
                <span>{profile?.targetLocations.join(", ") || "Not set"}</span>
                <span>{profile?.keywords.slice(0, 6).join(", ") || "Not set"}</span>
                <span>{matchedRoles}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={Archive} title="Prepared and Applied Roles" />
        <div className="data-table apps">
          <div className="data-row header">
            <span>Candidate</span>
            <span>Job</span>
            <span>Company</span>
            <span>Status</span>
            <span>Portal</span>
            <span>Resume</span>
          </div>
          {tenantAppliedRoles.map((record) => {
            const owner = users.find((user) => user.id === record.userId);
            return (
              <div className="data-row" key={record.id}>
                <span><strong>{owner?.name || record.userId}</strong><small>{owner?.email}</small></span>
                <span><strong>{record.title}</strong><small>{record.link}</small></span>
                <span>{record.companyName}</span>
                <span><Pill tone={record.status === "applied" ? "green" : "amber"}>{record.status}</Pill></span>
                <span>{record.portal}</span>
                <span>{record.resumeId}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MailCenter({
  currentUser,
  users,
  setUsers,
  threads,
  setThreads
}: {
  currentUser: PortalUser;
  users: PortalUser[];
  setUsers: (users: PortalUser[]) => void;
  threads: MailThread[];
  setThreads: (threads: MailThread[]) => void;
}) {
  const visibleThreads = currentUser.role === "SUPER_ADMIN"
    ? threads
    : currentUser.role === "TENANT_COMPANY_ADMIN"
      ? threads.filter((thread) =>
          thread.tenantId === currentUser.tenantId && (thread.status === "approval_requested" || thread.status === "approved")
        )
      : roleCan(currentUser, "email:approve")
        ? threads
        : threads.filter((thread) => thread.userId === currentUser.id);
  const canDraftOutreach = currentUser.role !== "TENANT_COMPANY_ADMIN" && currentUser.role !== "REVIEWER";

  function createOutreach() {
    const job = JOB_LISTINGS[0];
    const thread: MailThread = {
      id: `mail-${Date.now()}`,
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      jobId: job.id,
      contactName: "Hiring Team",
      contactEmail: `hiring@${job.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.example`,
      company: job.company,
      subject: `${job.title} application follow-up`,
      direction: "outbound",
      status: "draft",
      lastMessage: "Draft created from the tracked job and candidate resume context.",
      draft: `Hi Hiring Team, I recently prepared a resume for the ${job.title} role at ${job.company}. My background maps to ${job.skills.slice(0, 4).join(", ")} and I would appreciate the chance to discuss the fit.`,
      updatedAt: today()
    };
    setThreads([thread, ...threads]);
  }

  function setStatus(threadId: string, status: MailThread["status"], approvedBy?: string) {
    setThreads(threads.map((thread) => thread.id === threadId ? {
      ...thread,
      status,
      approvedBy,
      updatedAt: today(),
      lastMessage: status === "sent" ? "Email sent through the approved outbound queue." : thread.lastMessage
    } : thread));

    if (status === "approval_requested" || status === "sent") {
      setUsers(users.map((user) => user.id === currentUser.id ? {
        ...user,
        usage: {
          ...user.usage,
          approvalsRequested: status === "approval_requested" ? user.usage.approvalsRequested + 1 : user.usage.approvalsRequested,
          emailsSent: status === "sent" ? user.usage.emailsSent + 1 : user.usage.emailsSent
        }
      } : user));
    }
  }

  return (
    <div className="screen-stack">
      <section className="toolbar-line">
        {canDraftOutreach ? (
          <button className="icon-button text" onClick={createOutreach}>
            <Mail size={17} />
            Draft Outreach
          </button>
        ) : null}
        <Pill tone="blue">{currentUser.role === "TENANT_COMPANY_ADMIN" ? "tenant approval queue" : "incoming email tracking and approval workflow"}</Pill>
      </section>

      <section className="mail-grid">
        {!visibleThreads.length ? (
          <div className="empty-state">
            <CheckCircle2 size={26} />
            <strong>No email approvals waiting.</strong>
            <span>Candidate drafts appear here only after they request company-admin approval.</span>
          </div>
        ) : null}
        {visibleThreads.map((thread) => (
          <article className="mail-card" key={thread.id}>
            <header>
              <div>
                <strong>{thread.subject}</strong>
                <span>{thread.contactName} | {thread.contactEmail}</span>
              </div>
              <Pill tone={thread.status === "sent" ? "green" : thread.status === "approval_requested" ? "amber" : "blue"}>
                {thread.status}
              </Pill>
            </header>
            <p>{thread.lastMessage}</p>
            <textarea
              value={thread.draft}
              readOnly={currentUser.role === "TENANT_COMPANY_ADMIN"}
              onChange={(event) => setThreads(threads.map((item) => item.id === thread.id ? { ...item, draft: event.target.value } : item))}
            />
            <footer>
              {canDraftOutreach && (thread.status === "draft" || thread.status === "reply_drafted") ? (
                <button className="icon-button text" onClick={() => setStatus(thread.id, "approval_requested")}>
                  <ShieldCheck size={16} />
                  Request Approval
                </button>
              ) : null}
              {roleCan(currentUser, "email:approve") && thread.status === "approval_requested" ? (
                <button className="icon-button text" onClick={() => setStatus(thread.id, "approved", currentUser.email)}>
                  <CheckCircle2 size={16} />
                  Approve
                </button>
              ) : null}
              {currentUser.role !== "TENANT_COMPANY_ADMIN" && (thread.status === "approved" || currentUser.role === "INDIVIDUAL_CANDIDATE") ? (
                <button className="icon-button" onClick={() => setStatus(thread.id, "sent", thread.approvedBy)} title="Send approved email">
                  <Send size={16} />
                </button>
              ) : null}
            </footer>
          </article>
        ))}
      </section>
    </div>
  );
}

function AdminOps({
  view = "ops",
  reviewQueue,
  setReviewQueue
}: {
  view?: TabId;
  reviewQueue: AdminReviewItem[];
  setReviewQueue: (items: AdminReviewItem[]) => void;
}) {
  const [domains, setDomains] = useState(SUPPORTED_DOMAINS);
  const [techNames, setTechNames] = useState(TECHNOLOGY_TIMELINES.map((tech) => tech.name));
  const [domainDraft, setDomainDraft] = useState("");
  const [techDraft, setTechDraft] = useState("");
  const [componentDraft, setComponentDraft] = useState({
    role: "Data Engineer",
    technology: "Microsoft Fabric",
    domain: "Banking",
    timelineStart: 2018,
    timelineEnd: 2020,
    intent: "legacy fabric migration",
    baseLogic: "Migrated 2018 bank reporting pipelines into Microsoft Fabric workspaces for modern lakehouse governance."
  });
  const [scanResult, setScanResult] = useState<string[]>([]);
  const [bulkDraft, setBulkDraft] = useState({
    keyword: "Apache Kafka",
    jobTitles: "Data Engineer, Java Backend Engineer, Kafka Engineer",
    timelineStart: 2016,
    timelineEnd: 2035,
    domains: "Banking, Telecom, Healthcare",
    bullets: "Built Kafka event pipelines for payment, billing, and operational feeds with schema checks and retry handling.\nMaintained Kafka consumers for regulated data feeds so downstream reporting teams received traceable events."
  });
  const [bulkLoadMessage, setBulkLoadMessage] = useState("");

  function scanComponent() {
    const review = reviewComponentDraft(componentDraft);
    setScanResult(review.warnings.length ? review.warnings : ["No exact duplicate, semantic collision, or timeline conflict detected."]);
    setReviewQueue([
      {
        id: `review-${Date.now()}`,
        type: "component",
        title: componentDraft.intent,
        submittedBy: "current admin ops",
        status: review.warnings.length ? "review" : "draft",
        similarityScore: review.similarity,
        timelineStatus: review.warnings.some((warning) => warning.includes("timeline-valid")) ? "blocked" : "valid",
        notes: review.warnings.join(" ") || "Ready for admin review."
      },
      ...reviewQueue
    ]);
  }

  function updateReview(id: string, status: AdminReviewItem["status"]) {
    setReviewQueue(reviewQueue.map((item) => item.id === id ? { ...item, status } : item));
  }

  function loadBulkIntelligence() {
    const bullets = bulkDraft.bullets.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 1000);
    const titles = inputToList(bulkDraft.jobTitles);
    const selectedDomains = inputToList(bulkDraft.domains);
    if (!bulkDraft.keyword.trim() || !titles.length || !selectedDomains.length || !bullets.length) {
      setBulkLoadMessage("Keyword, job titles, domains, timeline, and at least one bullet are required.");
      return;
    }

    const created = bullets.slice(0, 25).map((bullet, index): AdminReviewItem => ({
      id: `bulk-review-${Date.now()}-${index}`,
      type: "component",
      title: `${bulkDraft.keyword}: ${titles[0]} ${selectedDomains[index % selectedDomains.length]} bullet ${index + 1}`,
      submittedBy: "admin ops bulk loader",
      status: "draft",
      similarityScore: 0,
      timelineStatus: bulkDraft.timelineStart < 2000 ? "warning" : "valid",
      notes: `Loaded for ${titles.join(", ")} | domains ${selectedDomains.join(", ")} | timeline ${bulkDraft.timelineStart}-${bulkDraft.timelineEnd}. ${bullet}`
    }));

    setReviewQueue([...created, ...reviewQueue]);
    setBulkLoadMessage(`Loaded ${bullets.length} verified bullet${bullets.length === 1 ? "" : "s"} for review. Showing first ${created.length} in the queue to keep the UI fast.`);
  }

  const componentWorkbench = (
    <section className="panel">
      <SectionTitle icon={Library} title="Reusable Component Workbench" />
      <div className="form-grid compact">
        <label>
          <span>Role</span>
          <input value={componentDraft.role} onChange={(event) => setComponentDraft({ ...componentDraft, role: event.target.value })} />
        </label>
        <label>
          <span>Technology</span>
          <input value={componentDraft.technology} onChange={(event) => setComponentDraft({ ...componentDraft, technology: event.target.value })} />
        </label>
        <label>
          <span>Domain</span>
          <input value={componentDraft.domain} onChange={(event) => setComponentDraft({ ...componentDraft, domain: event.target.value })} />
        </label>
        <label>
          <span>Timeline start</span>
          <input type="number" value={componentDraft.timelineStart} onChange={(event) => setComponentDraft({ ...componentDraft, timelineStart: Number(event.target.value) })} />
        </label>
        <label className="full">
          <span>Intent</span>
          <input value={componentDraft.intent} onChange={(event) => setComponentDraft({ ...componentDraft, intent: event.target.value })} />
        </label>
        <label className="full">
          <span>Base logic</span>
          <textarea value={componentDraft.baseLogic} onChange={(event) => setComponentDraft({ ...componentDraft, baseLogic: event.target.value })} />
        </label>
        <button className="icon-button text full" onClick={scanComponent}>
          <Fingerprint size={17} />
          Duplicate and Timeline Scan
        </button>
      </div>
      {scanResult.length ? (
        <ul className="plain-list scan-result">
          {scanResult.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </section>
  );

  const domainPanel = (
    <section className="panel">
      <SectionTitle icon={Building2} title="Domain Management" />
      <div className="inline-create">
        <input placeholder="Add domain" value={domainDraft} onChange={(event) => setDomainDraft(event.target.value)} />
        <button className="icon-button" onClick={() => {
          if (domainDraft.trim()) {
            setDomains([domainDraft.trim(), ...domains]);
            setDomainDraft("");
          }
        }} title="Add domain">
          <Plus size={16} />
        </button>
      </div>
      <div className="tag-cloud">
        {domains.map((domain) => <span key={domain}>{domain}</span>)}
      </div>
    </section>
  );

  const technologyPanel = (
    <section className="panel">
      <SectionTitle icon={DatabaseZap} title="Technology Management" />
      <div className="inline-create">
        <input placeholder="Add technology" value={techDraft} onChange={(event) => setTechDraft(event.target.value)} />
        <button className="icon-button" onClick={() => {
          if (techDraft.trim()) {
            setTechNames([techDraft.trim(), ...techNames]);
            setTechDraft("");
          }
        }} title="Add technology">
          <Plus size={16} />
        </button>
      </div>
      <div className="tag-cloud">
        {techNames.map((tech) => <span key={tech}>{tech}</span>)}
      </div>
    </section>
  );

  const bulkLoaderPanel = (
    <section className="panel">
      <SectionTitle icon={Upload} title="Verified DB Bulk Loader" />
      <div className="form-grid bulk-loader-grid">
        <label>
          <span>Keyword, tool, technology, or skill</span>
          <input value={bulkDraft.keyword} onChange={(event) => setBulkDraft({ ...bulkDraft, keyword: event.target.value })} />
        </label>
        <label>
          <span>Job titles</span>
          <input value={bulkDraft.jobTitles} onChange={(event) => setBulkDraft({ ...bulkDraft, jobTitles: event.target.value })} />
        </label>
        <label>
          <span>Timeline start</span>
          <input type="number" value={bulkDraft.timelineStart} onChange={(event) => setBulkDraft({ ...bulkDraft, timelineStart: Number(event.target.value) })} />
        </label>
        <label>
          <span>Timeline end</span>
          <input type="number" value={bulkDraft.timelineEnd} onChange={(event) => setBulkDraft({ ...bulkDraft, timelineEnd: Number(event.target.value) })} />
        </label>
        <label className="full">
          <span>Domains</span>
          <input value={bulkDraft.domains} onChange={(event) => setBulkDraft({ ...bulkDraft, domains: event.target.value })} />
        </label>
        <label className="full">
          <span>Roles and responsibilities per selected domain, one per line, up to 1000</span>
          <textarea value={bulkDraft.bullets} onChange={(event) => setBulkDraft({ ...bulkDraft, bullets: event.target.value })} />
        </label>
        <button className="icon-button text full" onClick={loadBulkIntelligence}>
          <DatabaseZap size={17} />
          Load Into Verified DB Queue
        </button>
      </div>
      {bulkLoadMessage ? <div className="profile-note">{bulkLoadMessage}</div> : null}
    </section>
  );

  const reviewQueuePanel = (
    <section className="panel">
      <SectionTitle icon={BadgeCheck} title="Approval and Publishing Queue" />
      <div className="data-table">
        <div className="data-row admin-review header">
          <span>Item</span>
          <span>Type</span>
          <span>Similarity</span>
          <span>Timeline</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {reviewQueue.map((item) => (
          <div className="data-row admin-review" key={item.id}>
            <span><strong>{item.title}</strong><small>{item.notes}</small></span>
            <span>{item.type}</span>
            <span>{item.similarityScore}%</span>
            <span><Pill tone={item.timelineStatus === "blocked" ? "red" : item.timelineStatus === "warning" ? "amber" : "green"}>{item.timelineStatus}</Pill></span>
            <span><Pill tone={item.status === "published" ? "green" : item.status === "rejected" ? "red" : "amber"}>{item.status}</Pill></span>
            <span className="row-actions">
              <button className="icon-button" onClick={() => updateReview(item.id, "approved")} title="Approve"><BadgeCheck size={15} /></button>
              <button className="icon-button" onClick={() => updateReview(item.id, "published")} title="Publish"><Upload size={15} /></button>
              <button className="icon-button" onClick={() => updateReview(item.id, "rejected")} title="Reject"><Trash2 size={15} /></button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  const duplicatePanel = (
    <div className="dashboard-layout">
      {componentWorkbench}
      <section className="panel">
        <SectionTitle icon={Fingerprint} title="Duplicate Scan Status" />
        <div className="duplicate-summary">
          <article><strong>{reviewQueue.filter((item) => item.similarityScore >= 85).length}</strong><span>Similarity warnings</span></article>
          <article><strong>{reviewQueue.filter((item) => item.status === "duplicate_scan").length}</strong><span>Items in duplicate scan</span></article>
          <article><strong>85%</strong><span>Semantic warning threshold</span></article>
        </div>
      </section>
    </div>
  );

  const timelinePanel = (
    <section className="panel">
      <SectionTitle icon={Clock3} title="Timeline Validation Rules" />
      <div className="timeline-grid">
        {TECHNOLOGY_TIMELINES.map((tech) => (
          <article key={tech.name}>
            <strong>{tech.name}</strong>
            <span>{tech.validFrom} - {tech.validTo}</span>
            <small>{tech.maturityNote}</small>
          </article>
        ))}
      </div>
    </section>
  );

  const aiReviewPanel = (
    <section className="dashboard-layout">
      <div className="panel">
        <SectionTitle icon={Sparkles} title="AI-Generated Content Review" />
        <ul className="plain-list compact-list">
          <li>Review drafts that came from prompt fallback instead of verified repository content.</li>
          <li>Check human naturalness, repetitive structure, synthetic metrics, and domain realism.</li>
          <li>Approve only content that can become reusable intelligence after duplicate and timeline checks.</li>
        </ul>
      </div>
      <div className="panel">
        <SectionTitle icon={Layers3} title="Prompt Versions" />
        <div className="prompt-list">
          {PROMPT_VERSIONS.map((prompt) => (
            <article key={prompt.id}>
              <Pill tone={prompt.status === "active" ? "green" : prompt.status === "testing" ? "amber" : "neutral"}>{prompt.status}</Pill>
              <strong>{prompt.name}</strong>
              <span>ATS {prompt.averageAtsScore} | Realism {prompt.averageRealismScore} | Callback {prompt.callbackRate}%</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const analyticsPanel = (
    <section className="metric-grid">
      <MetricCard label="Published Components" value={`${INTELLIGENCE_COMPONENTS.filter((component) => component.status === "published").length}`} sublabel="available for verified reuse" icon={Library} />
      <MetricCard label="Pending Reviews" value={`${reviewQueue.filter((item) => item.status === "review" || item.status === "duplicate_scan").length}`} sublabel="waiting for ops action" icon={BadgeCheck} tone="gold" />
      <MetricCard label="Blocked Timelines" value={`${reviewQueue.filter((item) => item.timelineStatus === "blocked").length}`} sublabel="invalid technology windows" icon={Clock3} tone="coral" />
      <MetricCard label="Prompt Benchmarks" value={`${PROMPT_VERSIONS.length}`} sublabel="tracked generation strategies" icon={BarChart3} tone="teal" />
    </section>
  );

  const opsOverviewPanel = (
    <section className="panel">
      <SectionTitle icon={ShieldCheck} title="Admin Ops Workspaces" />
      <div className="ops-workspace-grid">
        {[
          { title: "Components", text: "Create reusable resume logic with role, technology, domain, intent, and timeline metadata.", icon: Library },
          { title: "Approvals", text: "Approve, reject, and publish reviewed intelligence before it reaches the reusable repository.", icon: BadgeCheck },
          { title: "Domains", text: "Maintain business domains used for resume realism, datasets, systems, and compliance mapping.", icon: Building2 },
          { title: "Technologies", text: "Maintain canonical tools and skill names used by matching, retrieval, and resume assembly.", icon: DatabaseZap },
          { title: "Duplicate Scan", text: "Check exact, semantic, and intent collisions before reusable content is approved.", icon: Fingerprint },
          { title: "Timeline Rules", text: "Validate tools against realistic adoption windows so old projects stay believable.", icon: Clock3 },
          { title: "AI Review", text: "Review generated fallback content for naturalness, synthetic metrics, and hallucination risk.", icon: Sparkles },
          { title: "Analytics", text: "Watch component quality, prompt benchmarks, blocked items, and review workload.", icon: BarChart3 },
          { title: "Bulk Loader", text: "Load verified bullets by keyword, job title, domain, and timeline for controlled reuse.", icon: Upload }
        ].map((workspace) => {
          const Icon = workspace.icon;
          return (
            <article key={workspace.title}>
              <Icon size={18} />
              <strong>{workspace.title}</strong>
              <span>{workspace.text}</span>
            </article>
          );
        })}
      </div>
    </section>
  );

  if (view === "ops-components") {
    return <div className="screen-stack">{componentWorkbench}</div>;
  }
  if (view === "ops-approvals") {
    return <div className="screen-stack">{reviewQueuePanel}</div>;
  }
  if (view === "ops-domains") {
    return <div className="screen-stack">{domainPanel}</div>;
  }
  if (view === "ops-technologies") {
    return <div className="screen-stack">{technologyPanel}</div>;
  }
  if (view === "ops-duplicates") {
    return <div className="screen-stack">{duplicatePanel}</div>;
  }
  if (view === "ops-timeline") {
    return <div className="screen-stack">{timelinePanel}</div>;
  }
  if (view === "ops-review") {
    return <div className="screen-stack">{aiReviewPanel}</div>;
  }
  if (view === "ops-analytics") {
    return <div className="screen-stack">{analyticsPanel}</div>;
  }
  if (view === "ops-bulk") {
    return <div className="screen-stack">{bulkLoaderPanel}</div>;
  }

  return (
    <div className="screen-stack">
      {analyticsPanel}
      {opsOverviewPanel}
      {reviewQueuePanel}
    </div>
  );
}

function Repository() {
  return (
    <div className="screen-stack">
      <section className="metric-grid">
        <MetricCard label="Components" value={`${INTELLIGENCE_COMPONENTS.length}`} sublabel="role-tech-domain-timeline indexed" icon={Library} />
        <MetricCard label="Published" value={`${INTELLIGENCE_COMPONENTS.filter((component) => component.status === "published").length}`} sublabel="available for reuse" icon={BadgeCheck} tone="teal" />
        <MetricCard label="Domains" value={`${SUPPORTED_DOMAINS.length}`} sublabel="domain-aware generation" icon={Building2} tone="coral" />
        <MetricCard label="Prompt Versions" value={`${PROMPT_VERSIONS.length}`} sublabel="quality benchmarks" icon={Layers3} tone="gold" />
      </section>
      <section className="panel">
        <SectionTitle icon={DatabaseZap} title="Reusable Resume Intelligence" />
        <div className="data-table">
          <div className="data-row header">
            <span>Component</span>
            <span>Role</span>
            <span>Domain</span>
            <span>Technology</span>
            <span>Quality</span>
            <span>Status</span>
          </div>
          {INTELLIGENCE_COMPONENTS.map((component) => (
            <div className="data-row" key={component.id}>
              <span><strong>{component.intent}</strong><small>{component.baseLogic}</small></span>
              <span>{component.role}</span>
              <span>{component.domain}</span>
              <span>{component.technology}</span>
              <span>{component.qualityScore}</span>
              <span><Pill tone={component.status === "published" ? "green" : "amber"}>{component.status}</Pill></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Billing({
  currentUser,
  users,
  tenants,
  ledger,
  setLedger
}: {
  currentUser: PortalUser;
  users: PortalUser[];
  tenants: Tenant[];
  ledger: BillingLedgerItem[];
  setLedger: (items: BillingLedgerItem[]) => void;
}) {
  const visibleLedger = currentUser.role === "SUPER_ADMIN"
    ? ledger
    : currentUser.role === "TENANT_COMPANY_ADMIN"
      ? ledger.filter((item) => item.tenantId === currentUser.tenantId)
      : ledger.filter((item) => item.userId === currentUser.id);
  const openBalance = visibleLedger.filter((item) => item.status === "open").reduce((sum, item) => sum + item.amountCents, 0);

  function payOpen() {
    setLedger(ledger.map((item) => visibleLedger.some((visible) => visible.id === item.id) && item.status === "open" ? { ...item, status: "paid" } : item));
  }

  return (
    <div className="screen-stack">
      <section className="metric-grid">
        <MetricCard label="Open Balance" value={cents(openBalance)} sublabel="payable usage" icon={CreditCard} tone="gold" />
        <MetricCard label="Tracked Users" value={`${users.length}`} sublabel="billing attribution" icon={Users} />
        <MetricCard label="Tenants" value={`${tenants.length}`} sublabel="isolated billing accounts" icon={Building2} tone="coral" />
        <MetricCard label="Ledger Lines" value={`${visibleLedger.length}`} sublabel="auditable usage records" icon={Archive} tone="teal" />
      </section>
      <section className="panel">
        <SectionTitle
          icon={CircleDollarSign}
          title="Usage Billing Ledger"
          action={
            <button className="icon-button text" onClick={payOpen} disabled={!openBalance}>
              <CreditCard size={17} />
              Pay Open Balance
            </button>
          }
        />
        <div className="data-table">
          <div className="data-row billing-row header">
            <span>Line Item</span>
            <span>User</span>
            <span>Tenant</span>
            <span>Units</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {visibleLedger.map((item) => (
            <div className="data-row billing-row" key={item.id}>
              <span><strong>{item.label}</strong><small>{item.createdAt}</small></span>
              <span>{users.find((user) => user.id === item.userId)?.name || item.userId}</span>
              <span>{tenantName(tenants, item.tenantId)}</span>
              <span>{item.units}</span>
              <span>{cents(item.amountCents)}</span>
              <span><Pill tone={item.status === "paid" ? "green" : item.status === "included" ? "blue" : "amber"}>{item.status}</Pill></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Architecture() {
  return (
    <div className="screen-stack">
      <section className="architecture-band">
        {[
          ["Auth", "Super admin seed, RBAC permissions, tenant-scoped user profiles"],
          ["Tenant Layer", "Company admins invite candidates, manage company roles, and track employee usage"],
          ["Candidate Layer", "Resume generation, job tracking, outreach, incoming replies, approval-before-send"],
          ["Admin Ops", "Component creation, duplicate scan, domain and technology governance"],
          ["Production Adapters", "Replace local state with Clerk/Auth0, Postgres, SendGrid/Gmail, Stripe, Redis"]
        ].map(([title, copy]) => (
          <article key={title}>
            <span>{title}</span>
            <strong>{copy}</strong>
          </article>
        ))}
      </section>
      <section className="dashboard-layout">
        <div className="panel">
          <SectionTitle icon={LockKeyhole} title="Security and Compliance" />
          <ul className="plain-list compact-list">
            <li>RBAC permissions are centralized by role and enforced by visible workflow boundaries.</li>
            <li>Tenant admins see company candidates, usage, roles, and billing scoped to their tenant.</li>
            <li>Email send actions route through an approval state before the outbound queue marks them sent.</li>
            <li>Admin ops controls duplicate detection, timeline validation, approval, rejection, and publishing.</li>
          </ul>
        </div>
        <div className="panel">
          <SectionTitle icon={DatabaseZap} title="Domain Profiles" />
          <div className="domain-grid">
            {DOMAIN_PROFILES.slice(0, 8).map((profile) => (
              <article key={profile.name}>
                <strong>{profile.name}</strong>
                <span>{profile.dataTypes.slice(0, 4).join(", ")}</span>
                <small>{profile.compliance.join(", ")}</small>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ProductionPortalApp() {
  const { data: session, status } = useSession();
  const [users, setUsers] = usePersistentState<PortalUser[]>("lp-users", PORTAL_USERS);
  const [tenants, setTenants] = usePersistentState<Tenant[]>("lp-tenants", PORTAL_TENANTS);
  const [companyRoles, setCompanyRoles] = usePersistentState<CompanyRole[]>("lp-company-roles", COMPANY_ROLES);
  const [threads, setThreads] = usePersistentState<MailThread[]>("lp-mail-threads", MAIL_THREADS);
  const [ledger, setLedger] = usePersistentState<BillingLedgerItem[]>("lp-billing-ledger", BILLING_LEDGER);
  const [reviewQueue, setReviewQueue] = usePersistentState<AdminReviewItem[]>("lp-review-queue", ADMIN_REVIEW_QUEUE);
  const [candidateProfiles, setCandidateProfiles] = usePersistentState<CandidateApplicationProfile[]>("lp-candidate-profiles", DEFAULT_CANDIDATE_PROFILES);
  const [syncedRoles, setSyncedRoles] = usePersistentState<SyncedRole[]>("lp-synced-roles", []);
  const [appliedRoles, setAppliedRoles] = usePersistentState<AppliedRoleRecord[]>("lp-applied-role-records", []);
  const [resumeTemplates, setResumeTemplates] = usePersistentState<CandidateResumeInputTemplate[]>("lp-resume-input-templates", []);
  const [templateLimits, setTemplateLimits] = usePersistentState<TemplateLimitMap>("lp-template-limits", {});
  const [resumeRuns, setResumeRuns] = usePersistentState<ResumeRunRecord[]>("lp-resume-runs", []);
  const [sessionUserId, setSessionUserId] = usePersistentState<string | null>("lp-session-user", null);
  const [activeTab, setActiveTab] = useState<TabId>("command");
  const [result, setResult] = useState<ResumeGenerationResult | null>(null);

  const apiTenantId = session?.user?.tenantId ?? null;

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    const portalKey = session?.user?.portalKey;
    if (portalKey) {
      setSessionUserId(portalKey);
    } else if (status === "unauthenticated") {
      setSessionUserId(null);
    }
  }, [session?.user?.portalKey, status, setSessionUserId]);

  const currentUser = useMemo(
    () => users.find((user) => user.id === sessionUserId) || null,
    [sessionUserId, users]
  );

  useEffect(() => {
    const migratedTenants = tenants.map((tenant) => {
      if (tenant.id === "tenant-lp") {
        return {
          ...tenant,
          name: "askmehire Platform",
          billingOwner: tenant.billingOwner.replace("legitimatepartner.com", "askmehire.com")
        };
      }
      return tenant;
    });
    if (JSON.stringify(migratedTenants) !== JSON.stringify(tenants)) {
      setTenants(migratedTenants);
    }

    const migratedUsers = users.map((user) => {
      if (user.email.endsWith("@legitimatepartner.com")) {
        return {
          ...user,
          email: user.email.replace("@legitimatepartner.com", "@askmehire.com")
        };
      }
      return user;
    });
    if (JSON.stringify(migratedUsers) !== JSON.stringify(users)) {
      setUsers(migratedUsers);
    }
  }, [setTenants, setUsers, tenants, users]);

  useEffect(() => {
    if (currentUser) {
      const allowed = navFor(currentUser).map((item) => item.id);
      if (!allowed.includes(activeTab)) {
        setActiveTab("command");
      }
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    const dedupedTemplates = dedupeResumeTemplates(resumeTemplates);
    if (dedupedTemplates.length !== resumeTemplates.length) {
      setResumeTemplates(dedupedTemplates);
    }
  }, [resumeTemplates, setResumeTemplates]);

  useEffect(() => {
    const candidateUsers = users.filter((user) =>
      user.role === "INDIVIDUAL_CANDIDATE" || user.role === "TENANT_CANDIDATE"
    );
    const missingProfiles = candidateUsers
      .filter((user) => !candidateProfiles.some((profile) => profile.userId === user.id))
      .map((user) => buildDefaultProfileForUser(user));
    if (missingProfiles.length) {
      setCandidateProfiles([...missingProfiles, ...candidateProfiles]);
    }
  }, [candidateProfiles, setCandidateProfiles, users]);

  if (status === "loading") {
    return (
      <main className="auth-shell">
        <p className="muted">Loading session…</p>
      </main>
    );
  }

  if (!currentUser) {
    return <SignInScreen onSignIn={(userId) => setSessionUserId(userId)} />;
  }

  const navItems = navFor(currentUser);
  const isCompanyAdmin = currentUser.role === "TENANT_COMPANY_ADMIN";
  const tenantAdminProps = {
    currentUser,
    users,
    setUsers,
    tenants,
    companyRoles,
    setCompanyRoles,
    resumeTemplates,
    setResumeTemplates,
    templateLimits,
    setTemplateLimits,
    resumeRuns
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <img className="brand-logo" src="/askmehire-mark.png" alt="askmehire logo" />
          <span>
            <strong>askmehire</strong>
            <small>Resume Intelligence OS</small>
          </span>
        </div>

        <div className="identity-card">
          <strong>{currentUser.name}</strong>
          <span>{ROLE_LABELS[currentUser.role]}</span>
          <small>{tenantName(tenants, currentUser.tenantId)}</small>
        </div>

        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="sidebar-logout"
          onClick={() => {
            void signOut({ redirect: false }).then(() => setSessionUserId(null));
          }}
        >
          <LogOut size={17} />
          Sign out
        </button>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">{isCompanyAdmin ? "Company admin console" : "Role-based production portal"}</span>
            <h1>{navItems.find((item) => item.id === activeTab)?.label || "Command Center"}</h1>
          </div>
          <div className="topbar-actions">
            <Pill tone="green">{ROLE_LABELS[currentUser.role]}</Pill>
            <Pill tone="blue">{currentUser.status}</Pill>
            <Pill tone="amber">{cents(currentUser.usage.costCents)} usage</Pill>
          </div>
        </header>

        {activeTab === "command" ? (
          isCompanyAdmin
            ? <TenantAdmin view="tenant" {...tenantAdminProps} />
            : <CommandCenter currentUser={currentUser} users={users} tenants={tenants} result={result} />
        ) : null}
        {activeTab === "access" ? <AccessControl users={users} setUsers={setUsers} tenants={tenants} /> : null}
        {activeTab === "tenant" ? <TenantAdmin view="tenant" {...tenantAdminProps} /> : null}
        {activeTab === "tenant-candidates" ? <TenantAdmin view="tenant-candidates" {...tenantAdminProps} /> : null}
        {activeTab === "tenant-templates" ? <TenantAdmin view="tenant-templates" {...tenantAdminProps} /> : null}
        {activeTab === "tenant-usage" ? <TenantAdmin view="tenant-usage" {...tenantAdminProps} /> : null}
        {activeTab === "candidate" ? (
          <CandidateDesk
            currentUser={currentUser}
            users={users}
            setUsers={setUsers}
            ledger={ledger}
            setLedger={setLedger}
            candidateProfiles={candidateProfiles}
            setCandidateProfiles={setCandidateProfiles}
            resumeTemplates={resumeTemplates}
            setResumeTemplates={setResumeTemplates}
            templateLimits={templateLimits}
            resumeRuns={resumeRuns}
            setResumeRuns={setResumeRuns}
            result={result}
            setResult={setResult}
            apiTenantId={apiTenantId}
          />
        ) : null}
        {activeTab === "mail" ? <MailCenter currentUser={currentUser} users={users} setUsers={setUsers} threads={threads} setThreads={setThreads} /> : null}
        {ADMIN_OPS_TABS.includes(activeTab) ? <AdminOps view={activeTab} reviewQueue={reviewQueue} setReviewQueue={setReviewQueue} /> : null}
        {activeTab === "repository" ? <Repository /> : null}
        {activeTab === "jobs" ? (
          isCompanyAdmin
            ? <TenantJobActivity currentUser={currentUser} users={users} candidateProfiles={candidateProfiles} syncedRoles={syncedRoles} appliedRoles={appliedRoles} apiTenantId={apiTenantId} />
            : <JobsAndApplications currentUser={currentUser} users={users} setUsers={setUsers} candidateProfiles={candidateProfiles} setCandidateProfiles={setCandidateProfiles} syncedRoles={syncedRoles} setSyncedRoles={setSyncedRoles} appliedRoles={appliedRoles} setAppliedRoles={setAppliedRoles} result={result} apiTenantId={apiTenantId} />
        ) : null}
        {activeTab === "billing" ? <Billing currentUser={currentUser} users={users} tenants={tenants} ledger={ledger} setLedger={setLedger} /> : null}
        {activeTab === "architecture" ? <Architecture /> : null}
      </section>
    </main>
  );
}

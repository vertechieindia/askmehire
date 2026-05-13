"use client";

import { useMemo, useState } from "react";
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
  DatabaseZap,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  GitBranch,
  Gauge,
  History,
  Layers3,
  Library,
  LockKeyhole,
  Network,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Split,
  Upload,
  Users,
  WandSparkles,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  APPLICATIONS,
  AUDIT_EVENTS,
  DOMAIN_PROFILES,
  INTELLIGENCE_COMPONENTS,
  JOB_LISTINGS,
  PROMPT_VERSIONS,
  SUPPORTED_DOMAINS,
  TECHNOLOGY_TIMELINES
} from "@/lib/catalog";
import type { ResumeGenerationRequest, ResumeGenerationResult } from "@/lib/types";

type TabId = "command" | "studio" | "repository" | "jobs" | "admin" | "architecture";

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "command", label: "Command Center", icon: Gauge },
  { id: "studio", label: "Resume Studio", icon: WandSparkles },
  { id: "repository", label: "Repository", icon: Library },
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { id: "admin", label: "Admin Ops", icon: ShieldCheck },
  { id: "architecture", label: "Architecture", icon: Network }
];

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
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
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

function CommandCenter({ generated }: { generated: ResumeGenerationResult | null }) {
  const published = INTELLIGENCE_COMPONENTS.filter((component) => component.status === "published").length;
  const review = INTELLIGENCE_COMPONENTS.filter((component) => component.status === "review" || component.status === "similarity_scan").length;
  const avgCallback = PROMPT_VERSIONS.find((prompt) => prompt.status === "active")?.callbackRate ?? 0;
  const latestScores = generated?.scores;

  return (
    <div className="screen-stack">
      <section className="metric-grid">
        <MetricCard label="ATS Readiness" value={latestScores ? `${latestScores.ats}%` : "91%"} sublabel="keyword and title alignment" icon={FileCheck2} />
        <MetricCard label="Token Savings" value={generated ? `${generated.costGovernance.estimatedSavingsPercent}%` : "78%"} sublabel="reuse-first generation" icon={CircleDollarSign} tone="gold" />
        <MetricCard label="Reusable Logic" value={`${published}`} sublabel="published components" icon={DatabaseZap} tone="teal" />
        <MetricCard label="Callback Signal" value={`${avgCallback}%`} sublabel="active prompt benchmark" icon={BarChart3} tone="coral" />
      </section>

      <section className="dashboard-layout">
        <div className="panel wide">
          <SectionTitle icon={Workflow} title="Resume Intelligence Pipeline" />
          <div className="pipeline">
            {[
              ["JD Canonicalization", "Boilerplate removal and skill normalization"],
              ["Role and Domain Mapping", "Role family, industry, systems, and compliance signals"],
              ["Component Retrieval", "Role, technology, domain, timeline, and intent filters"],
              ["Validation", "Timeline, duplication, synthetic metrics, and realism scoring"],
              ["Patch Assembly", "Reusable logic with JD-specific rewrites and explainability"]
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
          <SectionTitle icon={Activity} title="Quality Gates" />
          <div className="score-list">
            <ScoreBar label="Human realism" value={latestScores?.humanRealism ?? 88} />
            <ScoreBar label="Domain authenticity" value={latestScores?.domainAuthenticity ?? 91} />
            <ScoreBar label="Timeline integrity" value={latestScores?.timelineIntegrity ?? 96} />
            <ScoreBar label="Uniqueness" value={latestScores?.uniqueness ?? 93} />
          </div>
        </div>
      </section>

      <section className="dashboard-layout">
        <div className="panel">
          <SectionTitle icon={Clock3} title="Approval Queue" />
          <div className="queue-list">
            <div>
              <strong>{review}</strong>
              <span>Components require review</span>
            </div>
            <div>
              <strong>1</strong>
              <span>Timeline conflict blocked</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Prompt versions benchmarked</span>
            </div>
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

function ResumeStudio({
  form,
  setForm,
  result,
  loading,
  onGenerate
}: {
  form: ResumeGenerationRequest;
  setForm: (form: ResumeGenerationRequest) => void;
  result: ResumeGenerationResult | null;
  loading: boolean;
  onGenerate: () => Promise<void>;
}) {
  function update<K extends keyof ResumeGenerationRequest>(key: K, value: ResumeGenerationRequest[K]) {
    setForm({ ...form, [key]: value });
  }

  function downloadMarkdown() {
    if (!result) {
      return;
    }
    const blob = new Blob([result.resumeMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.role.replace(/\s+/g, "-").toLowerCase()}-${result.domain.toLowerCase()}-resume.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="studio-grid">
      <section className="panel input-panel">
        <SectionTitle
          icon={Upload}
          title="Generation Inputs"
          action={
            <button className="icon-button text" onClick={onGenerate} disabled={loading}>
              {loading ? <RefreshCw className="spin" size={17} /> : <Play size={17} />}
              {loading ? "Generating" : "Generate Draft"}
            </button>
          }
        />

        <div className="form-grid compact">
          <label>
            <span>Full name</span>
            <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
          </label>
          <label>
            <span>Target title</span>
            <input value={form.targetTitle} onChange={(event) => update("targetTitle", event.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input value={form.email} onChange={(event) => update("email", event.target.value)} />
          </label>
          <label>
            <span>Phone</span>
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
          <label className="full">
            <span>LinkedIn</span>
            <input value={form.linkedin} onChange={(event) => update("linkedin", event.target.value)} />
          </label>
          <label className="full">
            <span>Strategy</span>
            <select value={form.strategy} onChange={(event) => update("strategy", event.target.value as ResumeGenerationRequest["strategy"])}>
              <option>recruiter-readable</option>
              <option>ATS-heavy</option>
              <option>consulting-style</option>
              <option>contract-focused</option>
              <option>federal-focused</option>
            </select>
          </label>
        </div>

        <label className="stacked">
          <span>Source resume</span>
          <textarea value={form.resumeText} onChange={(event) => update("resumeText", event.target.value)} />
        </label>

        <label className="stacked">
          <span>Job description</span>
          <textarea value={form.jobDescription} onChange={(event) => update("jobDescription", event.target.value)} />
        </label>
      </section>

      <section className="panel result-panel">
        <SectionTitle
          icon={FileText}
          title="Controlled Resume Draft"
          action={
            <button className="icon-button" onClick={downloadMarkdown} disabled={!result} title="Download Markdown">
              <Download size={17} />
            </button>
          }
        />

        {result ? (
          <div className="result-stack">
            <div className="result-summary">
              <Pill tone="green">{result.role}</Pill>
              <Pill tone="blue">{result.domain}</Pill>
              <Pill tone="amber">{result.costGovernance.route}</Pill>
            </div>

            <div className="score-list two-col">
              <ScoreBar label="ATS" value={result.scores.ats} />
              <ScoreBar label="Realism" value={result.scores.humanRealism} />
              <ScoreBar label="Domain" value={result.scores.domainAuthenticity} />
              <ScoreBar label="Timeline" value={result.scores.timelineIntegrity} />
              <ScoreBar label="Uniqueness" value={result.scores.uniqueness} />
              <ScoreBar label="Skill gap closure" value={result.scores.skillGapClosure} />
            </div>

            <div className="resume-preview">
              <pre>{result.resumeMarkdown}</pre>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={26} />
            <strong>Ready for a controlled generation run.</strong>
            <span>Default sample inputs are loaded.</span>
          </div>
        )}
      </section>

      {result ? (
        <section className="panel full-width">
          <SectionTitle icon={Split} title="Explainability and Cost Governance" />
          <div className="insight-grid">
            <div>
              <h3>Selected Components</h3>
              <div className="component-chip-list">
                {result.selectedComponents.map((component) => (
                  <article key={component.id}>
                    <strong>{component.intent}</strong>
                    <span>{component.role} | {component.domain} | {component.technology}</span>
                    <small>{component.id}</small>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <h3>Decision Trace</h3>
              <ul className="plain-list">
                {result.explainability.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Cost Route</h3>
              <div className="cost-box">
                <span>Baseline tokens</span>
                <strong>{result.costGovernance.baselineTokenEstimate}</strong>
                <span>Optimized tokens</span>
                <strong>{result.costGovernance.optimizedTokenEstimate}</strong>
                <span>Estimated savings</span>
                <strong>{result.costGovernance.estimatedSavingsPercent}%</strong>
                <span>Reuse ratio</span>
                <strong>{result.costGovernance.reuseRatio}%</strong>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Repository() {
  const statusCounts = useMemo(
    () =>
      INTELLIGENCE_COMPONENTS.reduce<Record<string, number>>((acc, component) => {
        acc[component.status] = (acc[component.status] || 0) + 1;
        return acc;
      }, {}),
    []
  );

  return (
    <div className="screen-stack">
      <section className="metric-grid">
        <MetricCard label="Components" value={`${INTELLIGENCE_COMPONENTS.length}`} sublabel="role-tech-domain-timeline indexed" icon={Library} />
        <MetricCard label="Published" value={`${statusCounts.published || 0}`} sublabel="available for reuse" icon={BadgeCheck} tone="teal" />
        <MetricCard label="Aging Risk" value="1" sublabel="timeline conflict detected" icon={Clock3} tone="gold" />
        <MetricCard label="Domains" value={`${SUPPORTED_DOMAINS.length}`} sublabel="domain-aware generation" icon={Building2} tone="coral" />
      </section>

      <section className="panel">
        <SectionTitle icon={DatabaseZap} title="Reusable Intelligence Repository" />
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
              <span>
                <strong>{component.intent}</strong>
                <small>{component.baseLogic}</small>
              </span>
              <span>{component.role}</span>
              <span>{component.domain}</span>
              <span>{component.technology}</span>
              <span>
                <div className="mini-meter"><i style={{ width: `${component.qualityScore}%` }} /></div>
                {component.qualityScore}
              </span>
              <span>
                <Pill tone={component.status === "published" ? "green" : component.status === "similarity_scan" ? "amber" : "neutral"}>
                  {component.status}
                </Pill>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-layout">
        <div className="panel">
          <SectionTitle icon={GitBranch} title="Hierarchy" />
          <div className="hierarchy">
            {["ROLE", "TECHNOLOGY", "DOMAIN", "TIMELINE", "CONTENT"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="panel">
          <SectionTitle icon={Fingerprint} title="Duplicate Controls" />
          <ul className="plain-list compact-list">
            <li>Exact content match blocks identical bullets.</li>
            <li>Semantic similarity above 85 percent routes to review.</li>
            <li>Intent collision checks role, technology, domain, and intent together.</li>
            <li>Cross-user duplication is flagged before export release.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function JobsAndApplications() {
  return (
    <div className="screen-stack">
      <section className="toolbar-line">
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search normalized jobs" defaultValue="data engineer banking" />
        </div>
        <button className="icon-button text">
          <RefreshCw size={17} />
          Sync Sources
        </button>
      </section>

      <section className="job-grid">
        {JOB_LISTINGS.map((job) => (
          <article className="job-card" key={job.id}>
            <div>
              <Pill tone="blue">{job.source}</Pill>
              <Pill tone="green">{job.applyMode}</Pill>
            </div>
            <h3>{job.title}</h3>
            <p>{job.company} | {job.location}</p>
            <div className="job-skills">
              {job.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
            <footer>
              <strong>{job.normalizedScore}% match</strong>
              <span>{job.postedAt}</span>
            </footer>
          </article>
        ))}
      </section>

      <section className="panel">
        <SectionTitle icon={Archive} title="Application Tracking" />
        <div className="data-table apps">
          <div className="data-row header">
            <span>Application</span>
            <span>Job</span>
            <span>Status</span>
            <span>ATS</span>
            <span>Realism</span>
            <span>Artifacts</span>
          </div>
          {APPLICATIONS.map((application) => {
            const job = JOB_LISTINGS.find((item) => item.id === application.jobId);
            return (
              <div className="data-row" key={application.id}>
                <span>
                  <strong>{application.resumeId}</strong>
                  <small>{application.appliedAt}</small>
                </span>
                <span>{job?.title || application.jobId}</span>
                <span><Pill tone="amber">{application.status}</Pill></span>
                <span>{application.atsScore}</span>
                <span>{application.realismScore}</span>
                <span>DOCX | JD | Cover</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AdminOps() {
  const activePrompt = PROMPT_VERSIONS.find((prompt) => prompt.status === "active");
  return (
    <div className="screen-stack">
      <section className="dashboard-layout">
        <div className="panel">
          <SectionTitle icon={ShieldCheck} title="Scoring Engines" />
          <div className="engine-grid">
            {[
              ["ATS Score", "keyword coverage, title alignment, parse safety"],
              ["Human Realism", "repetition, phrasing, buzzword density"],
              ["Domain Authenticity", "systems, datasets, compliance, workflow fit"],
              ["Synthetic Metrics", "scale, latency, percentage, throughput realism"],
              ["Prompt Injection", "JD sanitization and instruction isolation"],
              ["Timeline Rules", "technology maturity and deprecation windows"]
            ].map(([title, copy]) => (
              <article key={title}>
                <CheckCircle2 size={17} />
                <strong>{title}</strong>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <SectionTitle icon={Sparkles} title="Model Routing" />
          <div className="route-box">
            <strong>{activePrompt?.name}</strong>
            <span>{activePrompt?.modelRoute}</span>
            <ScoreBar label="ATS benchmark" value={activePrompt?.averageAtsScore ?? 91} />
            <ScoreBar label="Realism benchmark" value={activePrompt?.averageRealismScore ?? 88} />
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={Clock3} title="Timeline Validation Rules" />
        <div className="timeline-grid">
          {TECHNOLOGY_TIMELINES.slice(0, 18).map((tech) => (
            <article key={tech.name}>
              <strong>{tech.name}</strong>
              <span>{tech.validFrom} - {tech.validTo}</span>
              <small>{tech.maturityNote}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-layout">
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
        <div className="panel">
          <SectionTitle icon={Users} title="RBAC Matrix" />
          <div className="rbac-list">
            {[
              ["Super Admin", "Full platform access"],
              ["Admin", "Component approvals"],
              ["Reviewer", "QA and reviews"],
              ["Recruiter", "Resume generation"],
              ["Candidate", "Personal access"]
            ].map(([role, permission]) => (
              <div key={role}>
                <strong>{role}</strong>
                <span>{permission}</span>
              </div>
            ))}
          </div>
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
          ["Frontend", "Next.js app router, typed client UI, role-aware workspaces"],
          ["API Gateway", "Generation, components, jobs, applications, exports"],
          ["Services", "JD analysis, retrieval, scoring, approval, tracking"],
          ["AI Orchestration", "patch-first routing, reviewer pass, fallback parsing"],
          ["Data", "PostgreSQL, pgvector, object storage, audit events"]
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
            <li>JWT-ready auth boundary with tenant-scoped RBAC permissions.</li>
            <li>Encrypted object storage references for resume DOCX, JD snapshots, and cover letters.</li>
            <li>Audit events for prompt edits, approvals, downloads, application status changes, and admin actions.</li>
            <li>Data export, retention policy, and delete-my-data workflows represented in the database contract.</li>
          </ul>
        </div>

        <div className="panel">
          <SectionTitle icon={Workflow} title="Async Orchestration" />
          <ul className="plain-list compact-list">
            <li>Redis queue boundary for generation, parsing, export, and connector jobs.</li>
            <li>Retry policies separate recoverable AI failures from invalid user input.</li>
            <li>Parallel validators score ATS, realism, timeline integrity, and duplication before approval.</li>
            <li>Human QA escalation triggers when confidence or realism scores fall below thresholds.</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={DatabaseZap} title="Domain Profiles" />
        <div className="domain-grid">
          {DOMAIN_PROFILES.map((profile) => (
            <article key={profile.name}>
              <strong>{profile.name}</strong>
              <span>{profile.dataTypes.slice(0, 4).join(", ")}</span>
              <small>{profile.compliance.join(", ")}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function LegitimatePartnerApp() {
  const [activeTab, setActiveTab] = useState<TabId>("command");
  const [form, setForm] = useState<ResumeGenerationRequest>(INITIAL_FORM);
  const [result, setResult] = useState<ResumeGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Generation failed.");
      }

      setResult(payload as ResumeGenerationResult);
      setActiveTab("studio");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

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

        <nav>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeTab === item.id ? "active" : ""}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="tenant-box">
          <Building2 size={18} />
          <span>
            <strong>Recruiting Agency A</strong>
            <small>isolated workspace</small>
          </span>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">AI-powered resume intelligence operating system</span>
            <h1>{NAV_ITEMS.find((item) => item.id === activeTab)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <Pill tone="green">SOC2-ready</Pill>
            <Pill tone="blue">pgvector architecture</Pill>
            <button className="icon-button text" onClick={generate} disabled={loading}>
              {loading ? <RefreshCw className="spin" size={17} /> : <WandSparkles size={17} />}
              Run Engine
            </button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {activeTab === "command" ? <CommandCenter generated={result} /> : null}
        {activeTab === "studio" ? <ResumeStudio form={form} setForm={setForm} result={result} loading={loading} onGenerate={generate} /> : null}
        {activeTab === "repository" ? <Repository /> : null}
        {activeTab === "jobs" ? <JobsAndApplications /> : null}
        {activeTab === "admin" ? <AdminOps /> : null}
        {activeTab === "architecture" ? <Architecture /> : null}
      </section>
    </main>
  );
}

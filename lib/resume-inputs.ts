export interface ResumeClientInput {
  id: string;
  clientName: string;
  location: string;
  timeline: string;
  jobTitle: string;
}

export interface CandidateResumeInput {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedin: string;
  clients: ResumeClientInput[];
}

export type ResumeInputTemplateStatus = "active" | "change_requested" | "delete_requested" | "admin_updated";

export interface CandidateResumeInputTemplate {
  id: string;
  userId: string;
  tenantId?: string;
  name: string;
  input: CandidateResumeInput;
  status: ResumeInputTemplateStatus;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  resumeCount: number;
  changeRequest?: string;
}

export interface ResumeRunRecord {
  id: string;
  userId: string;
  tenantId?: string;
  templateId?: string;
  templateName: string;
  fullName: string;
  targetTitle: string;
  generatedAt: string;
  resumeId: string;
  outputFormat: "draft" | "docx";
}

export type TemplateLimitMap = Record<string, number>;

export interface FormattedResumeSection {
  heading: string;
  lines: string[];
}

export interface FormattedClientSection {
  client: ResumeClientInput;
  projectDescription: string;
  keyContributions: string;
  responsibilities: string[];
  achievements: string[];
  environment: string;
}

export interface FormattedResumeContent {
  summary: string[];
  skillMatrix: FormattedResumeSection[];
  clients: FormattedClientSection[];
}

export const SUBBAREDDY_SAMPLE_INPUT_TEXT = `Name: Subbareddy Yemireddy
Job Title: Senior Workday Techno Functional Consultant
Email: subba@gmail.com
Phone: +1 (913) 956-8272
LinkedIn: https://www.linkedin.com/in/subba-reddy-197a9b150/
Client 1: Sparklight
Location: Phoenix, Arizona
Time Line: May 2022 to Present
Job Title: Senior Workday Techno Functional Consultant
Client 2: Desert Financial Credit Union
Location: Phoenix, Arizona
Time Line: Jan 2019 to May 2022
Job Title: Senior Workday Techno Functional Consultant
Client 3: Blue Cross Blue Shield of Arizona
Location: Phoenix, Arizona
Time Line: May 2016 to Jan 2019
Job Title: Senior Workday Techno Functional Consultant
Client 4: Barclays
Location: Hyderabad, India
Time Line: Jan 2012 to Nov 2015
Job Title: Workday Techno Functional Consultant`;

export function createEmptyResumeInput(): CandidateResumeInput {
  return {
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    linkedin: "",
    clients: [
      {
        id: `client-${Date.now()}`,
        clientName: "",
        location: "",
        timeline: "",
        jobTitle: ""
      }
    ]
  };
}

export function createSubbareddySampleInput(): CandidateResumeInput {
  return parseResumeInputText(SUBBAREDDY_SAMPLE_INPUT_TEXT);
}

function setField(input: CandidateResumeInput, key: keyof Omit<CandidateResumeInput, "clients">, value: string) {
  input[key] = value.trim();
}

export function parseResumeInputText(text: string): CandidateResumeInput {
  const input = createEmptyResumeInput();
  input.clients = [];
  let currentClient: ResumeClientInput | null = null;

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      return;
    }
    const label = match[1].trim().toLowerCase();
    const value = match[2].trim();

    if (/^client\s+\d+/.test(label)) {
      currentClient = {
        id: `client-${input.clients.length + 1}`,
        clientName: value,
        location: "",
        timeline: "",
        jobTitle: input.jobTitle
      };
      input.clients.push(currentClient);
      return;
    }

    if (!currentClient) {
      if (label === "name") {
        setField(input, "fullName", value);
      } else if (label === "job title") {
        setField(input, "jobTitle", value);
      } else if (label === "email") {
        setField(input, "email", value);
      } else if (label === "phone") {
        setField(input, "phone", value);
      } else if (label === "linkedin") {
        setField(input, "linkedin", value);
      }
      return;
    }

    if (label === "location") {
      currentClient.location = value;
    } else if (label === "time line" || label === "timeline") {
      currentClient.timeline = value;
    } else if (label === "job title") {
      currentClient.jobTitle = value || input.jobTitle;
    }
  });

  if (!input.clients.length) {
    input.clients = createEmptyResumeInput().clients;
  }

  input.clients = input.clients.map((client, index) => ({
    ...client,
    id: client.id || `client-${index + 1}`,
    jobTitle: client.jobTitle || input.jobTitle
  }));

  return input;
}

export function resumeInputToText(input: CandidateResumeInput) {
  const lines = [
    `Name: ${input.fullName}`,
    `Job Title: ${input.jobTitle}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `LinkedIn: ${input.linkedin}`
  ];

  input.clients.forEach((client, index) => {
    lines.push(
      `Client ${index + 1}: ${client.clientName}`,
      `Location: ${client.location}`,
      `Time Line: ${client.timeline}`,
      `Job Title: ${client.jobTitle}`
    );
  });

  return lines.join("\n");
}

function domainForClient(clientName: string) {
  const normalized = clientName.toLowerCase();
  if (normalized.includes("spark") || normalized.includes("cable")) {
    return "telecom and utilities";
  }
  if (normalized.includes("desert") || normalized.includes("credit") || normalized.includes("barclays")) {
    return "banking and financial services";
  }
  if (normalized.includes("blue cross") || normalized.includes("shield")) {
    return "healthcare insurance";
  }
  return "enterprise services";
}

function projectDescription(client: ResumeClientInput) {
  const domain = domainForClient(client.clientName);
  if (domain === "telecom and utilities") {
    return `${client.clientName}, a broadband, cable, voice, and business communication provider, supported geographically distributed workforce operations across field services, customer care, corporate teams, and regional support groups. The Workday program focused on stabilizing HCM configuration, payroll and benefits integrations, workforce reporting, security controls, and release support for HR operations.`;
  }
  if (domain === "banking and financial services" && client.clientName.toLowerCase().includes("barclays")) {
    return `${client.clientName} supported global banking operations with large employee populations, regulated workforce processes, and distributed HR service delivery. The Workday engagement focused on HCM configuration, reporting, payroll coordination, integration support, data validation, and operational support for banking workforce administration.`;
  }
  if (domain === "banking and financial services") {
    return `${client.clientName} is a regional financial institution supporting consumer banking, lending, branch operations, and internal workforce services across Arizona. The Workday program supported HR operations modernization, payroll validation, employee lifecycle administration, security administration, and workforce reporting for branch and corporate teams.`;
  }
  if (domain === "healthcare insurance") {
    return `${client.clientName} supported healthcare insurance operations involving members, providers, claims support teams, compliance functions, and internal workforce groups. The Workday engagement focused on benefits, absence, payroll coordination, reporting, employee data validation, security support, and healthcare workforce compliance needs.`;
  }
  return `${client.clientName} supported enterprise workforce operations requiring Workday configuration, reporting, integrations, testing, data validation, deployment support, and production stabilization across multiple HR functions.`;
}

function keyContributions(client: ResumeClientInput, index: number) {
  const focus = [
    "business discussions, configuration activities, integration coordination, reporting development, security administration, testing execution, deployment readiness, and production support",
    "branch workforce administration, payroll validation, report enhancement, approval routing, security reviews, data reconciliation, and release support",
    "employee lifecycle configuration, benefits and absence validation, integration monitoring, compliance reporting, UAT support, and operational issue resolution",
    "Workday HCM support, data conversion, EIB loads, calculated field updates, report validation, integration troubleshooting, and post release support"
  ][index] || "Workday configuration, reporting, integration, testing, deployment, and support activities";

  return `Worked as a ${client.jobTitle || "Workday consultant"} supporting ${focus} for ${domainForClient(client.clientName)} stakeholders.`;
}

const responsibilitySets = [
  [
    "Conducted requirement gathering sessions with HR, payroll, recruiting, and benefits teams to document operational gaps and translate business expectations into practical Workday solutions.",
    "Configured Workday Core HCM business processes and organizational structures supporting workforce transactions, supervisory changes, employee lifecycle activities, and approval routing across regional operations.",
    "Supported Benefits and Payroll configuration activities by validating eligibility rules, deduction mappings, payroll processing dependencies, and integration requirements with external vendor systems.",
    "Developed Advanced Reports, Matrix Reports, and Composite Reports using calculated fields to support workforce analysis, payroll validation, operational reporting, and compliance reviews.",
    "Built Workday Studio integrations for employee data exchanges with external vendors, transforming inbound and outbound files using XSLT and document transformation logic.",
    "Coordinated Enterprise Interface Builder and Core Connector integrations supporting payroll providers, benefits carriers, recruiting systems, and downstream workforce applications.",
    "Assisted security administrators with domain security policies, role assignments, and permission reviews to maintain appropriate workforce data access across business functions.",
    "Collaborated with HR stakeholders during business process framework reviews to simplify approval routing, reduce manual interventions, and improve transaction visibility.",
    "Prepared unit testing and system integration testing scenarios covering recruiting, payroll, benefits, absence, and time tracking processes supporting release readiness.",
    "Supported user acceptance testing by coordinating defect reviews, validating business scenarios, documenting resolution details, and assisting stakeholders during testing walkthrough sessions.",
    "Participated in cutover planning meetings supporting deployment sequencing, data migration coordination, integration scheduling, and go live preparation across multiple implementation phases.",
    "Provided hypercare and production support after deployments by investigating reported issues, validating root causes, and coordinating fixes with technical and functional teams."
  ],
  [
    "Gathered workforce administration requirements from branch operations and HR teams to support Workday configuration changes aligned with employee servicing processes.",
    "Configured supervisory organizations and staffing models supporting branch hierarchy changes, internal transfers, reporting structures, and operational approval routing.",
    "Created calculated fields and custom reports supporting payroll reconciliation, compensation reviews, employee movement tracking, and compliance reporting requests.",
    "Validated payroll integrations by reviewing source files, transformation rules, deduction mappings, and outbound vendor data during processing cycles.",
    "Maintained business process condition rules for job changes, compensation changes, terminations, and position updates to reduce routing exceptions.",
    "Supported Workday security reviews by validating domain policies, role assignments, and manager access for branch and corporate workforce groups.",
    "Prepared EIB templates for worker data updates, organization changes, and compensation corrections while coordinating validation with HR operations.",
    "Partnered with recruiting coordinators to adjust requisition workflows, interview steps, approval routing, and candidate communication dependencies.",
    "Reviewed integration event failures, researched data issues, and coordinated corrections with technical teams before downstream payroll processing windows.",
    "Supported regression testing during Workday releases by validating high impact HR, payroll, benefits, and reporting scenarios with business users.",
    "Documented recurring support scenarios in knowledge articles so HR operations teams could resolve common transaction and reporting questions faster.",
    "Coordinated production issue triage through ServiceNow and JIRA while maintaining status visibility for HR leaders and operational stakeholders."
  ],
  [
    "Supported healthcare workforce processes by gathering requirements from HR, benefits, absence, payroll, and compliance teams across operational groups.",
    "Configured absence and benefits related Workday processes supporting eligibility validation, leave administration, employee updates, and approval routing.",
    "Built custom reports for healthcare workforce compliance, headcount tracking, benefits eligibility, employee status reviews, and payroll audit support.",
    "Prepared calculated fields for report prompts, effective dated logic, eligibility checks, and exception reporting across employee lifecycle processes.",
    "Assisted integration teams with EIB and Core Connector monitoring for benefits carriers, payroll providers, and identity management applications.",
    "Validated employee data conversion files by comparing worker records, organization assignments, compensation data, and benefit enrollment values.",
    "Supported user acceptance testing by preparing healthcare workforce scenarios, logging defects, retesting fixes, and documenting validation results.",
    "Reviewed Workday security assignments to ensure HR, payroll, benefits, and compliance users had appropriate access to workforce data.",
    "Coordinated release validation activities by checking business process changes, report outputs, and integration events after Workday updates.",
    "Investigated production support tickets related to employee transactions, benefits records, report discrepancies, and integration failures.",
    "Prepared deployment support notes and operational handoff materials for HR teams responsible for ongoing workforce administration activities.",
    "Worked with compliance stakeholders to validate reporting outputs supporting audit reviews, employee record checks, and healthcare workforce governance."
  ],
  [
    "Supported Workday HCM configuration activities for banking workforce processes involving job changes, organization assignments, compensation updates, and employee records.",
    "Prepared EIB data load files for employee updates, supervisory organization changes, compensation corrections, and worker profile maintenance activities.",
    "Developed custom reports and calculated fields supporting HR operations, payroll validation, audit requests, and employee data reconciliation.",
    "Assisted technical teams with Workday Web Services, XML validations, outbound file checks, and integration event troubleshooting activities.",
    "Validated converted worker data by reviewing field mappings, effective dates, organization assignments, compensation values, and missing record exceptions.",
    "Supported business process testing by preparing scenarios for hires, transfers, terminations, compensation changes, and approval routing workflows.",
    "Reviewed security group assignments and domain policy impacts with administrators to support appropriate access for HR and payroll users.",
    "Coordinated defect tracking with functional teams by documenting issue details, retesting fixes, and confirming resolution evidence before closure.",
    "Participated in deployment readiness reviews covering data loads, report validation, integration scheduling, and post release support preparation.",
    "Supported payroll coordination by validating worker data extracts, payment related employee fields, and downstream file readiness before processing.",
    "Maintained Workday support documentation covering configuration changes, report logic, integration notes, and recurring operational support steps.",
    "Provided production support by analyzing transaction issues, report mismatches, integration failures, and employee data discrepancies after releases."
  ]
];

const achievementSets = [
  [
    "Stabilized payroll related integrations after multiple release cycles by improving validation checks and strengthening coordination between Workday and vendor teams.",
    "Improved reporting consistency across recruiting, payroll, and workforce administration by redesigning calculated fields and simplifying report level security.",
    "Supported phased Workday enhancement deployments by coordinating testing reviews, deployment validations, and post production issue resolution activities."
  ],
  [
    "Reduced recurring branch workforce reporting issues by standardizing calculated field logic and validating report prompts with HR operations teams.",
    "Improved payroll processing confidence by strengthening pre payroll validation steps for worker data, deductions, and vendor integration outputs.",
    "Helped business users complete release testing faster by preparing reusable scenarios and documenting defect resolution evidence clearly."
  ],
  [
    "Improved healthcare workforce compliance reporting by refining eligibility logic, employee status checks, and audit focused report outputs.",
    "Supported smoother benefits and absence testing by aligning Workday scenarios with HR, compliance, and operational stakeholder expectations.",
    "Reduced recurring support questions by preparing practical handoff notes for benefits, absence, reporting, and employee data review activities."
  ],
  [
    "Improved worker data conversion quality by validating source mappings, EIB files, and effective dated records before production migration.",
    "Strengthened payroll and HR reporting reliability by resolving calculated field defects and documenting report validation steps for support teams.",
    "Supported successful release stabilization by coordinating defect retesting, issue documentation, and production support handoff activities."
  ]
];

function environmentForClient(index: number) {
  const environments = [
    "Workday HCM, Workday Payroll, Benefits, Recruiting, Talent Management, Time Tracking, Absence Management, Workday Studio, Enterprise Interface Builder, Core Connectors, Advanced Reports, Matrix Reports, Composite Reports, Calculated Fields, BIRT, Workday Web Services, SOAP APIs, REST APIs, XML, XSLT, Prism Analytics, ServiceNow, JIRA, Confluence, Microsoft Excel",
    "Workday Core HCM, Payroll, Compensation, Recruiting, Benefits, Business Process Framework, Supervisory Organizations, Staffing Models, Custom Reports, Calculated Fields, EIB, Core Connectors, Workday Security, Domain Policies, ServiceNow, JIRA, HP ALM, SharePoint, Microsoft Excel",
    "Workday HCM, Benefits, Absence Management, Payroll, Time Tracking, Advanced Reports, Calculated Fields, EIB, Core Connectors, Workday Web Services, XML, XSLT, Domain Security Policies, UAT, Regression Testing, ServiceNow, SharePoint, Microsoft Excel",
    "Workday HCM, Compensation, Payroll, EIB, Custom Reports, Calculated Fields, Workday Web Services, XML, SOAP, Data Conversion, Worker Data Loads, Business Process Framework, Domain Security, HP ALM, JIRA, Microsoft Excel, Microsoft Word"
  ];
  return environments[index] || environments[0];
}

export function buildFormattedResumeContent(input: CandidateResumeInput): FormattedResumeContent {
  const years = Math.max(15, input.clients.length * 3);
  const summary = [
    `${input.jobTitle} with ${years} plus years of experience supporting Workday HCM implementations, enhancements, integrations, reporting, deployment activities, and production support across banking, healthcare, telecom, and enterprise environments.`,
    "Experienced in Workday Core HCM, Payroll, Recruiting, Benefits, Compensation, Absence Management, Time Tracking, Talent Management, Performance Management, Position Management, and Organization Management across enterprise HR operations.",
    "Worked extensively on Workday Studio, Enterprise Interface Builder EIB, Core Connectors, Cloud Connect integrations, Workday Web Services, SOAP APIs, REST APIs, XML transformations, and XSLT based integration solutions.",
    "Strong experience developing Advanced Reports, Matrix Reports, Composite Reports, Calculated Fields, BIRT Reports, Workday Dashboards, Worklets, Custom Reports, and Report as a Service RAAS solutions.",
    "Hands on experience configuring Business Process Framework BPF workflows, approval routing, condition rules, notifications, delegation setup, and organizational hierarchy management supporting HR operational processes.",
    "Experienced in Workday security administration involving Role Based Security, Domain Security Policies, User Based Security Groups, Intersection Security Groups, and workforce data access management activities.",
    "Supported data conversion, data validation, worker data loads, EIB based mass uploads, data reconciliation, migration activities, and workforce record verification during implementation and deployment phases.",
    "Strong background supporting Unit Testing, System Integration Testing, User Acceptance Testing, Regression Testing, defect tracking, deployment readiness reviews, and hypercare support activities across Workday releases.",
    "Worked closely with HR operations, payroll teams, recruiting coordinators, benefits administrators, compliance teams, and technical integration resources during requirement gathering and solution alignment discussions.",
    "Experienced supporting payroll processing validation, compensation cycle activities, workforce reporting, employee lifecycle administration, onboarding workflows, and workforce compliance reporting requirements.",
    "Supported inbound and outbound integrations involving payroll vendors, benefits providers, identity management systems, recruiting applications, and downstream workforce reporting platforms.",
    "Proficient in troubleshooting integration failures, report discrepancies, workflow interruptions, employee transaction issues, and production incidents using Workday administrative and ticket management tools.",
    "Worked with ServiceNow, JIRA, HP ALM, SharePoint, Confluence, Microsoft Teams, Microsoft Excel, Microsoft Word, and Microsoft PowerPoint supporting documentation, issue tracking, testing coordination, and operational reporting.",
    "Experienced supporting multi location and regional workforce environments requiring organizational restructuring, workforce visibility improvements, employee data governance, and standardized HR operational processes.",
    "Strong exposure to deployment planning, cutover coordination, production migration activities, release validation reviews, continuous enhancement support, and long term Workday operational stabilization efforts."
  ];

  const skillMatrix: FormattedResumeSection[] = [
    { heading: "Workday Modules", lines: ["Workday Core HCM, Workday Payroll, Workday Recruiting, Workday Benefits, Workday Compensation, Workday Absence Management, Time Tracking, Talent Management, Performance Management, Position Management, Organization Management"] },
    { heading: "Workday Integrations", lines: ["Workday Studio, Enterprise Interface Builder EIB, Core Connectors, Cloud Connect Integrations, Workday Web Services, Document Transformation, Integration Event Monitoring"] },
    { heading: "Reporting and Analytics", lines: ["Advanced Reports, Matrix Reports, Composite Reports, Calculated Fields, BIRT Reporting, Workday Dashboards, Worklets, Custom Reports, Report Writer, Report as a Service RAAS"] },
    { heading: "APIs and Web Services", lines: ["SOAP APIs, REST APIs, Workday Web Services WWS, XML, XSLT, Web Service Testing, API Validation"] },
    { heading: "Business Process Configuration", lines: ["BPF, Workflow Configuration, Approval Chains, Condition Rules, Notifications, Delegation Setup"] },
    { heading: "Security", lines: ["Role Based Security, Domain Security Policies, User Based Security Groups, Intersection Security Groups, Segregation of Duties"] },
    { heading: "Migration and Conversion", lines: ["EIB Data Loads, Data Conversion, Data Validation, Mass Data Uploads, Worker Data Loads, Data Mapping"] },
    { heading: "Testing Tools and Activities", lines: ["Unit Testing, SIT, UAT, Regression Testing, Defect Tracking, Test Scenario Preparation"] },
    { heading: "Deployment and Support", lines: ["Cutover Planning, Go Live, Hypercare, Production, Release Management, Incident Resolution"] },
    { heading: "HR Operations Tools", lines: ["Supervisory Organizations, Staffing Models, Job Profiles, Compensation Grades, Eligibility Rules"] },
    { heading: "Ticketing and Support Tools", lines: ["ServiceNow, JIRA, HP ALM, Incident Tracking, Change Management, Workday Administrative Tools"] },
    { heading: "Database and Query Tools", lines: ["SQL, Basic Query Validation, Data Extraction, Data Comparison, Data Audit Support"] }
  ];

  const clients = input.clients.map((client, index) => ({
    client,
    projectDescription: projectDescription(client),
    keyContributions: keyContributions(client, index),
    responsibilities: responsibilitySets[index] || responsibilitySets[0],
    achievements: achievementSets[index] || achievementSets[0],
    environment: environmentForClient(index)
  }));

  return { summary, skillMatrix, clients };
}

export function buildResumeSourceText(input: CandidateResumeInput) {
  return [
    input.fullName,
    input.jobTitle,
    `${input.email} | ${input.phone} | ${input.linkedin}`,
    "",
    ...input.clients.flatMap((client) => [
      `${client.clientName} | ${client.location} | ${client.jobTitle} | ${client.timeline}`,
      `Supported Workday HCM, integrations, reporting, testing, deployment, and production support for ${domainForClient(client.clientName)} operations.`
    ])
  ].join("\n");
}

export function buildFormattedResumePlainText(input: CandidateResumeInput) {
  const content = buildFormattedResumeContent(input);
  const lines = [
    input.fullName,
    input.jobTitle,
    `Email: ${input.email} | Phone: ${input.phone} | LinkedIn: ${input.linkedin}`,
    "",
    "Professional Summary",
    ...content.summary,
    "",
    "Skill Matrix",
    ...content.skillMatrix.map((section) => `${section.heading}: ${section.lines.join(", ")}`),
    "",
    "Professional Experience"
  ];

  content.clients.forEach((section) => {
    lines.push(
      "",
      `${section.client.clientName}, ${section.client.location} | ${section.client.timeline}`,
      `Job Title: ${section.client.jobTitle}`,
      `Project Description: ${section.projectDescription}`,
      `Key Contributions: ${section.keyContributions}`,
      "Roles and Responsibilities:",
      ...section.responsibilities,
      "Key Achievements:",
      ...section.achievements,
      `Environment: ${section.environment}`
    );
  });

  return lines.join("\n");
}

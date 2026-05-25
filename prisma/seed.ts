import { PrismaClient, Prisma } from "@prisma/client";
import {
  APPLICATIONS,
  DOMAIN_PROFILES,
  INTELLIGENCE_COMPONENTS,
  JOB_LISTINGS,
  TECHNOLOGY_TIMELINES
} from "../lib/catalog";
import { hashPassword } from "../lib/auth/password";
import { portalUserUuid, SEED_IDS } from "../lib/ids/stable-uuid";

const prisma = new PrismaClient();

async function main() {
  const tenantId = SEED_IDS.tenant;
  const tenantNorthstarId = SEED_IDS.tenantNorthstar;
  const demoUserId = SEED_IDS.demoUser;
  const technologyNames = new Set(TECHNOLOGY_TIMELINES.map((tech) => tech.name));

  await prisma.tenant.upsert({
    where: { id: tenantId },
    create: {
      id: tenantId,
      name: "askmehire Bootstrap Tenant",
      plan: "Enterprise"
    },
    update: { name: "askmehire Bootstrap Tenant" }
  });

  await prisma.tenant.upsert({
    where: { id: tenantNorthstarId },
    create: {
      id: tenantNorthstarId,
      name: "Northstar Recruiting",
      plan: "Agency"
    },
    update: { name: "Northstar Recruiting" }
  });

  const portalAccounts = [
    {
      portalKey: "user-super",
      email: "superadmin@askmehire.com",
      name: "Sai Kankanala",
      role: "SUPER_ADMIN",
      tenantId,
      title: "Platform Owner",
      password: "Askmehire@123"
    },
    {
      portalKey: "user-tenant-admin",
      email: "admin@northstarrecruiting.com",
      name: "Maya Chen",
      role: "TENANT_COMPANY_ADMIN",
      tenantId: tenantNorthstarId,
      title: "Recruiting Operations Admin",
      password: "Tenant@123"
    },
    {
      portalKey: "user-tenant-candidate-1",
      email: "jordan.patel@northstarrecruiting.com",
      name: "Jordan Patel",
      role: "TENANT_CANDIDATE",
      tenantId: tenantNorthstarId,
      title: "Java Backend Engineer",
      password: "Candidate@123"
    },
    {
      portalKey: "user-individual",
      email: "alex.morgan@example.com",
      name: "Alex Morgan",
      role: "INDIVIDUAL_CANDIDATE",
      tenantId: null as string | null,
      title: "Senior Data Engineer",
      password: "Candidate@123"
    },
    {
      portalKey: "user-admin-ops",
      email: "ops@askmehire.com",
      name: "Priya Raman",
      role: "ADMIN_OPS",
      tenantId,
      title: "Resume Intelligence Ops Lead",
      password: "Ops@123"
    }
  ] as const;

  for (const row of portalAccounts) {
    const id = portalUserUuid(row.portalKey);
    const passwordHash = await hashPassword(row.password);
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        email: row.email.toLowerCase(),
        name: row.name,
        role: row.role,
        tenantId: row.tenantId,
        status: "active",
        title: row.title,
        portalKey: row.portalKey,
        passwordHash
      },
      update: {
        email: row.email.toLowerCase(),
        name: row.name,
        role: row.role,
        tenantId: row.tenantId,
        title: row.title,
        portalKey: row.portalKey,
        passwordHash
      }
    });
  }

  await prisma.user.upsert({
    where: { id: demoUserId },
    create: {
      id: demoUserId,
      tenantId,
      name: "Demo Candidate",
      email: "demo-candidate@askmehire.local",
      role: "INDIVIDUAL_CANDIDATE",
      status: "active",
      title: "Candidate"
    },
    update: {}
  });

  for (const profile of DOMAIN_PROFILES) {
    const id = SEED_IDS.domain(profile.name);
    await prisma.domain.upsert({
      where: { id },
      create: {
        id,
        name: profile.name,
        profile: profile as unknown as Prisma.InputJsonValue
      },
      update: { profile: profile as unknown as Prisma.InputJsonValue }
    });
  }

  for (const tech of TECHNOLOGY_TIMELINES) {
    const id = SEED_IDS.technology(tech.name);
    await prisma.technology.upsert({
      where: { id },
      create: {
        id,
        name: tech.name,
        validFrom: tech.validFrom,
        validTo: tech.validTo,
        aliases: tech.aliases,
        category: tech.category,
        maturityNote: tech.maturityNote
      },
      update: {
        validFrom: tech.validFrom,
        validTo: tech.validTo,
        aliases: tech.aliases,
        category: tech.category,
        maturityNote: tech.maturityNote
      }
    });
  }

  const roleNames = new Set<string>();
  for (const c of INTELLIGENCE_COMPONENTS) {
    roleNames.add(c.role);
  }
  for (const name of roleNames) {
    const id = SEED_IDS.role(name);
    await prisma.role.upsert({
      where: { id },
      create: { id, name, category: "catalog" },
      update: {}
    });
  }

  for (const c of INTELLIGENCE_COMPONENTS) {
    if (!technologyNames.has(c.technology)) {
      throw new Error(`Missing technology timeline for component ${c.id}: ${c.technology}`);
    }

    const id = SEED_IDS.component(c.id);
    const roleId = SEED_IDS.role(c.role);
    const techId = SEED_IDS.technology(c.technology);
    const domainId = SEED_IDS.domain(c.domain);
    await prisma.component.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        roleId,
        technologyId: techId,
        domainId,
        timelineStart: c.timelineStart,
        timelineEnd: c.timelineEnd,
        componentType: c.componentType,
        intent: c.intent,
        baseLogic: c.baseLogic,
        variations: c.variations as unknown as Prisma.InputJsonValue,
        qualityScore: c.qualityScore,
        usageCount: c.usageCount,
        freshnessScore: c.freshnessScore,
        deprecationScore: c.deprecationScore,
        status: c.status,
        tags: c.tags
      },
      update: {
        baseLogic: c.baseLogic,
        variations: c.variations as unknown as Prisma.InputJsonValue,
        qualityScore: c.qualityScore,
        usageCount: c.usageCount,
        freshnessScore: c.freshnessScore,
        deprecationScore: c.deprecationScore,
        status: c.status,
        tags: c.tags
      }
    });
  }

  for (const job of JOB_LISTINGS) {
    const id = SEED_IDS.job(job.id);
    await prisma.job.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        source: job.source,
        externalId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        domain: job.domain,
        skills: job.skills,
        description: job.skills.join(", "),
        jdHash: `seed-${job.id}`,
        normalizedScore: job.normalizedScore,
        applyMode: job.applyMode,
        postedAt: new Date(job.postedAt)
      },
      update: {
        title: job.title,
        normalizedScore: job.normalizedScore,
        skills: job.skills,
        description: job.skills.join(", ")
      }
    });
  }

  const resumeLegacyIds = new Set(APPLICATIONS.map((a) => a.resumeId));
  for (const rid of resumeLegacyIds) {
    const id = SEED_IDS.resume(rid);
    await prisma.resume.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        userId: demoUserId,
        jdHash: `seed-${rid}`,
        role: "Data Engineer",
        domain: "Technology",
        strategy: "recruiter-readable",
        markdown: "",
        atsScore: 0,
        realismScore: 0,
        domainScore: 0,
        timelineScore: 0,
        uniquenessScore: 0,
        promptVersion: "seed-v1"
      },
      update: {}
    });
  }

  for (const app of APPLICATIONS) {
    const id = SEED_IDS.application(app.id);
    await prisma.application.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        userId: demoUserId,
        jobId: SEED_IDS.job(app.jobId),
        resumeId: SEED_IDS.resume(app.resumeId),
        status: app.status,
        appliedAt: new Date(app.appliedAt),
        atsScore: app.atsScore,
        realismScore: app.realismScore,
        resumeDocxPath: app.artifacts.resumeDocx,
        jdSnapshotPath: app.artifacts.jdSnapshot,
        coverLetterPath: app.artifacts.coverLetter
      },
      update: {
        status: app.status,
        atsScore: app.atsScore,
        realismScore: app.realismScore
      }
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete. DEFAULT_TENANT_ID=", tenantId);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

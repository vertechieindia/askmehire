import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapPrismaJobToListing } from "@/lib/mappers/job-mapper";
import { jdHashForJob } from "@/lib/integrations/jobs/connector-catalog";
import { EXTERNAL_CONNECTOR_PLATFORMS, INDEXED_JOB_SOURCES } from "@/lib/integrations/jobs/types";
import { stableUuid } from "@/lib/ids/stable-uuid";
import type { JobListing } from "@/lib/types";
import type { NormalizedConnectorJob } from "@/lib/integrations/jobs/types";

export interface JobSearchGroupedResult {
  jobs: JobListing[];
  bySource: Record<string, { count: number; jobs: JobListing[] }>;
  total: number;
}

function buildSearchWhere(
  tenantId: string,
  query: string,
  domainFilter: string,
  visibleSources: string[]
): Prisma.JobWhereInput {
  const q = query.trim();
  const d = domainFilter.trim();
  const where: Prisma.JobWhereInput = {
    tenantId,
    source: { in: visibleSources }
  };
  if (d) {
    where.domain = { equals: d, mode: "insensitive" };
  }
  if (q) {
    const mode = Prisma.QueryMode.insensitive;
    where.OR = [
      { title: { contains: q, mode } },
      { company: { contains: q, mode } },
      { location: { contains: q, mode } },
      { domain: { contains: q, mode } },
      { description: { contains: q, mode } },
      { skills: { hasSome: q.split(/\s+/).filter(Boolean) } }
    ];
  }
  return where;
}

export class JobRepository {
  async listConnectedConnectorSources(tenantId: string) {
    const rows = await prisma.jobConnector.findMany({
      where: {
        tenantId,
        status: "connected",
        portalName: { in: [...EXTERNAL_CONNECTOR_PLATFORMS] }
      },
      select: { portalName: true }
    });
    return rows.map((row) => row.portalName);
  }

  buildVisibleSources(connectedConnectorSources: string[]) {
    return ["Internal", ...connectedConnectorSources.filter((source) => INDEXED_JOB_SOURCES.includes(source as (typeof INDEXED_JOB_SOURCES)[number]))];
  }

  async purgeJobsBySource(tenantId: string, source: string) {
    const staleJobs = await prisma.job.findMany({
      where: { tenantId, source },
      select: { id: true }
    });
    if (staleJobs.length === 0) {
      return { count: 0 };
    }
    const staleJobIds = staleJobs.map((job) => job.id);
    await prisma.application.deleteMany({
      where: { tenantId, jobId: { in: staleJobIds } }
    });
    return prisma.job.deleteMany({
      where: { tenantId, id: { in: staleJobIds } }
    });
  }

  async purgeDisconnectedConnectorJobs(tenantId: string, connectedConnectorSources: string[]) {
    const disconnected = EXTERNAL_CONNECTOR_PLATFORMS.filter((portal) => !connectedConnectorSources.includes(portal));
    let total = 0;
    for (const source of disconnected) {
      const result = await this.purgeJobsBySource(tenantId, source);
      total += result.count;
    }
    return { count: total };
  }

  async purgeDisallowedSources(tenantId: string) {
    const staleJobs = await prisma.job.findMany({
      where: {
        tenantId,
        source: { notIn: [...INDEXED_JOB_SOURCES] }
      },
      select: { id: true }
    });
    if (staleJobs.length === 0) {
      return { count: 0 };
    }
    const staleJobIds = staleJobs.map((job) => job.id);
    await prisma.application.deleteMany({
      where: {
        tenantId,
        jobId: { in: staleJobIds }
      }
    });
    return prisma.job.deleteMany({
      where: {
        tenantId,
        id: { in: staleJobIds }
      }
    });
  }

  async search(tenantId: string, query: string, domainFilter: string, visibleSources: string[]) {
    const where = buildSearchWhere(tenantId, query, domainFilter, visibleSources);
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { normalizedScore: "desc" }
    });
    return jobs.map(mapPrismaJobToListing);
  }

  async searchGrouped(tenantId: string, query: string, domainFilter: string): Promise<JobSearchGroupedResult> {
    await this.purgeDisallowedSources(tenantId);
    const connectedSources = await this.listConnectedConnectorSources(tenantId);
    await this.purgeDisconnectedConnectorJobs(tenantId, connectedSources);
    const visibleSources = this.buildVisibleSources(connectedSources);
    const jobs = await this.search(tenantId, query, domainFilter, visibleSources);
    const bySource: Record<string, { count: number; jobs: JobListing[] }> = {};
    for (const job of jobs) {
      if (!bySource[job.source]) {
        bySource[job.source] = { count: 0, jobs: [] };
      }
      bySource[job.source].count += 1;
      bySource[job.source].jobs.push(job);
    }
    return { jobs, bySource, total: jobs.length };
  }

  async createInternal(
    tenantId: string,
    input: {
      title: string;
      company: string;
      location: string;
      domain: string;
      skills: string[];
      description: string;
      applyMode?: JobListing["applyMode"];
      normalizedScore?: number;
      postedAt?: string;
    }
  ): Promise<JobListing> {
    const externalId = `internal-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const description = input.description.trim() || input.skills.join(", ");
    const row = await prisma.job.create({
      data: {
        id: randomUUID(),
        tenantId,
        source: "Internal",
        externalId,
        title: input.title.trim(),
        company: input.company.trim(),
        location: input.location.trim(),
        domain: input.domain.trim(),
        skills: input.skills,
        description,
        jdHash: jdHashForJob({ source: "Internal", externalId, description }),
        normalizedScore: input.normalizedScore ?? 80,
        applyMode: input.applyMode ?? "manual",
        postedAt: input.postedAt ? new Date(input.postedAt) : new Date()
      }
    });
    return mapPrismaJobToListing(row);
  }

  async upsertConnectorJob(tenantId: string, job: NormalizedConnectorJob): Promise<JobListing> {
    const id = stableUuid("askmehire", "job", `${tenantId}|${job.source}|${job.externalId}`);
    const description = job.description.trim() || job.skills.join(", ");
    const row = await prisma.job.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        source: job.source,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        domain: job.domain,
        skills: job.skills,
        description,
        jdHash: jdHashForJob({ source: job.source, externalId: job.externalId, description }),
        normalizedScore: job.normalizedScore,
        applyMode: job.applyMode,
        postedAt: new Date(job.postedAt)
      },
      update: {
        title: job.title,
        company: job.company,
        location: job.location,
        domain: job.domain,
        skills: job.skills,
        description,
        jdHash: jdHashForJob({ source: job.source, externalId: job.externalId, description }),
        normalizedScore: job.normalizedScore,
        applyMode: job.applyMode,
        postedAt: new Date(job.postedAt)
      }
    });
    return mapPrismaJobToListing(row);
  }
}

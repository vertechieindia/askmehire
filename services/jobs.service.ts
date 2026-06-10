import { JobRepository } from "@/repositories/job.repository";
import type { ApiContext } from "@/lib/http/with-api-handler";
import type { JobListing } from "@/lib/types";
import { emitDomainEvent } from "@/events/domain-events";

export class JobsService {
  constructor(private readonly repo = new JobRepository()) {}

  async searchGrouped(ctx: ApiContext, query: string, domain: string) {
    return this.repo.searchGrouped(ctx.tenantId, query, domain);
  }

  async createInternal(
    body: {
      title: string;
      company: string;
      location: string;
      domain: string;
      skills: string[];
      description?: string;
      applyMode?: JobListing["applyMode"];
      normalizedScore?: number;
      postedAt?: string;
    },
    ctx: ApiContext
  ) {
    const job = await this.repo.createInternal(ctx.tenantId, {
      title: body.title,
      company: body.company,
      location: body.location,
      domain: body.domain,
      skills: body.skills,
      description: body.description ?? body.skills.join(", "),
      applyMode: body.applyMode,
      normalizedScore: body.normalizedScore,
      postedAt: body.postedAt
    });
    await emitDomainEvent({
      type: "jobs.synced",
      tenantId: ctx.tenantId,
      requestId: ctx.requestId,
      payload: { source: "Internal", jobId: job.id, action: "created" }
    });
    return job;
  }
}

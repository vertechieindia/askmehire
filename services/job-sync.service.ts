import { buildDefaultProfileForUser, syncJobsForCandidate } from "@/lib/job-integrations";
import type { CandidateApplicationProfile, SyncedRole } from "@/lib/job-integrations";
import type { ApiContext } from "@/lib/http/with-api-handler";
import { AppError } from "@/lib/http/api-errors";
import { emitDomainEvent } from "@/events/domain-events";

export class JobSyncService {
  async sync(
    body: {
      profile?: CandidateApplicationProfile;
      existing?: SyncedRole[];
      cycle?: number;
      user?: { id: string; name: string; email: string; title: string };
    },
    ctx: ApiContext
  ) {
    const profile = body.profile || (body.user ? buildDefaultProfileForUser(body.user) : null);
    if (!profile) {
      throw new AppError("PROFILE_REQUIRED", "Candidate application profile is required.", 400);
    }
    const jobs = syncJobsForCandidate(profile, body.existing || [], body.cycle || Date.now());
    await emitDomainEvent({
      type: "jobs.synced",
      tenantId: ctx.tenantId,
      requestId: ctx.requestId,
      payload: { userId: profile.userId, count: jobs.length }
    });
    return {
      refreshedAt: new Date().toISOString(),
      refreshEverySeconds: 60,
      jobs,
      excluded: jobs.filter((job) => job.status === "excluded")
    };
  }
}

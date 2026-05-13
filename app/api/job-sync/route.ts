import { NextResponse } from "next/server";
import { buildDefaultProfileForUser, syncJobsForCandidate } from "@/lib/job-integrations";
import type { CandidateApplicationProfile, SyncedRole } from "@/lib/job-integrations";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      profile?: CandidateApplicationProfile;
      existing?: SyncedRole[];
      cycle?: number;
      user?: {
        id: string;
        name: string;
        email: string;
        title: string;
      };
    };

    const profile = body.profile || (body.user ? buildDefaultProfileForUser(body.user) : null);
    if (!profile) {
      return NextResponse.json({ error: "Candidate application profile is required." }, { status: 400 });
    }

    const jobs = syncJobsForCandidate(profile, body.existing || [], body.cycle || Date.now());
    return NextResponse.json({
      refreshedAt: new Date().toISOString(),
      refreshEverySeconds: 60,
      jobs,
      excluded: jobs.filter((job) => job.status === "excluded")
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Job sync failed.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

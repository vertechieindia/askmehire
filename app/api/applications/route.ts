import { NextResponse } from "next/server";
import { applicationStore } from "@/lib/store";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    applications: applicationStore
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ApplicationRecord>;

    if (!body.jobId || !body.resumeId) {
      return NextResponse.json({ error: "jobId and resumeId are required." }, { status: 400 });
    }

    const record: ApplicationRecord = {
      id: `app-${Date.now()}`,
      jobId: body.jobId,
      userId: body.userId || "user-demo",
      resumeId: body.resumeId,
      status: (body.status as ApplicationStatus) || "Saved",
      atsScore: body.atsScore || 0,
      realismScore: body.realismScore || 0,
      appliedAt: new Date().toISOString().slice(0, 10),
      artifacts: body.artifacts || {
        resumeDocx: `s3://lp-demo/${body.resumeId}.docx`,
        jdSnapshot: `s3://lp-demo/${body.jobId}-jd.txt`,
        coverLetter: `s3://lp-demo/${body.jobId}-cover.txt`
      }
    };

    applicationStore.unshift(record);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Application tracking failed.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

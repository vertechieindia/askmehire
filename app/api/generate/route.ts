import { NextResponse } from "next/server";
import { generateResume } from "@/lib/resume-engine";
import type { ResumeGenerationRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResumeGenerationRequest;

    if (!body.jobDescription || body.jobDescription.trim().length < 40) {
      return NextResponse.json(
        { error: "A usable job description is required." },
        { status: 400 }
      );
    }

    const result = generateResume({
      fullName: body.fullName || "Candidate Name",
      targetTitle: body.targetTitle || "Data Engineer",
      email: body.email || "candidate@example.com",
      phone: body.phone || "(555) 010-2048",
      linkedin: body.linkedin || "linkedin.com/in/candidate",
      resumeText: body.resumeText || "",
      jobDescription: body.jobDescription,
      strategy: body.strategy || "recruiter-readable"
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Resume generation failed.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

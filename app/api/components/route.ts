import { NextResponse } from "next/server";
import { componentStore } from "@/lib/store";
import { reviewComponentDraft } from "@/lib/resume-engine";
import type { ResumeComponent } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    components: componentStore,
    totals: {
      all: componentStore.length,
      published: componentStore.filter((component) => component.status === "published").length,
      draft: componentStore.filter((component) => component.status === "draft").length,
      review: componentStore.filter((component) => component.status === "review" || component.status === "similarity_scan").length,
      retired: componentStore.filter((component) => component.status === "retired").length
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ResumeComponent>;
    const required = ["role", "technology", "domain", "timelineStart", "timelineEnd", "intent", "baseLogic"] as const;
    const missing = required.filter((field) => body[field] === undefined || body[field] === "");

    if (missing.length) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
    }

    const review = reviewComponentDraft({
      role: body.role as string,
      technology: body.technology as string,
      domain: body.domain as string,
      timelineStart: Number(body.timelineStart),
      timelineEnd: Number(body.timelineEnd),
      intent: body.intent as string,
      baseLogic: body.baseLogic as string
    });

    const component: ResumeComponent = {
      id: `cmp-${Date.now()}`,
      role: body.role as string,
      technology: body.technology as string,
      domain: body.domain as string,
      timelineStart: Number(body.timelineStart),
      timelineEnd: Number(body.timelineEnd),
      componentType: body.componentType || "responsibility",
      intent: body.intent as string,
      baseLogic: body.baseLogic as string,
      variations: body.variations?.length ? body.variations : [body.baseLogic as string],
      qualityScore: body.qualityScore ?? 70,
      usageCount: 0,
      freshnessScore: body.freshnessScore ?? 70,
      deprecationScore: body.deprecationScore ?? 0,
      status: review.warnings.length ? "review" : "draft",
      tags: body.tags ?? []
    };

    componentStore.unshift(component);

    return NextResponse.json({
      component,
      review
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Component creation failed.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

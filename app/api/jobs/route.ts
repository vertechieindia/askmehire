import { NextResponse } from "next/server";
import { jobStore } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").toLowerCase();
  const domain = (searchParams.get("domain") || "").toLowerCase();

  const jobs = jobStore
    .filter((job) => (domain ? job.domain.toLowerCase() === domain : true))
    .filter((job) => {
      if (!query) {
        return true;
      }
      const haystack = `${job.title} ${job.company} ${job.location} ${job.domain} ${job.skills.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => b.normalizedScore - a.normalizedScore);

  return NextResponse.json({
    jobs,
    sourceCoverage: ["LinkedIn", "Dice", "Monster", "ZipRecruiter", "Glassdoor", "Prime Vendor"],
    antiSpamPolicy: {
      mode: "human_assisted",
      rateLimit: "20 prepared applications per user per day",
      automationBoundary: "Connector workflows prepare and track applications but do not spam-submit."
    }
  });
}

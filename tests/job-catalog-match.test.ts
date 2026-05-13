import { describe, expect, it } from "vitest";
import { matchSyncedRoleToCatalogJobId, pickSeededResumeLegacyId } from "@/lib/job-catalog-match";

describe("matchSyncedRoleToCatalogJobId", () => {
  it("matches exact title and company", () => {
    expect(
      matchSyncedRoleToCatalogJobId({
        title: "Senior Data Engineer",
        company: "Northbridge Bank"
      })
    ).toBe("job-001");
  });

  it("matches Techfetch role to LinkedIn catalog listing by company and title", () => {
    expect(
      matchSyncedRoleToCatalogJobId({
        title: "Java Backend Engineer",
        company: "Cedar Payments"
      })
    ).toBe("job-002");
  });

  it("returns null when no catalog row fits", () => {
    expect(
      matchSyncedRoleToCatalogJobId({
        title: "Site Reliability Magician",
        company: "Unknown Corp"
      })
    ).toBeNull();
  });
});

describe("pickSeededResumeLegacyId", () => {
  it("uses primary when present in seed applications", () => {
    expect(pickSeededResumeLegacyId("resume-java-payments-v2")).toBe("resume-java-payments-v2");
  });

  it("falls back when primary is unknown", () => {
    expect(pickSeededResumeLegacyId("master-resume")).toBe("resume-bank-data-v3");
  });
});

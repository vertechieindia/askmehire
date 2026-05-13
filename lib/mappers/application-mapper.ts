import type { Application } from "@prisma/client";
import type { ApplicationRecord } from "@/lib/types";

export function mapPrismaApplicationToRecord(row: Application): ApplicationRecord {
  return {
    id: row.id,
    jobId: row.jobId,
    userId: row.userId,
    resumeId: row.resumeId,
    status: row.status as ApplicationRecord["status"],
    atsScore: row.atsScore,
    realismScore: row.realismScore,
    appliedAt: row.appliedAt ? row.appliedAt.toISOString().slice(0, 10) : row.createdAt.toISOString().slice(0, 10),
    artifacts: {
      resumeDocx: row.resumeDocxPath ?? "",
      jdSnapshot: row.jdSnapshotPath ?? "",
      coverLetter: row.coverLetterPath ?? ""
    }
  };
}

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { mapPrismaApplicationToRecord } from "@/lib/mappers/application-mapper";
import { resolveOrStableUuid } from "@/lib/ids/stable-uuid";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";

export class ApplicationRepository {
  async list(tenantId: string, options?: { userId?: string }): Promise<ApplicationRecord[]> {
    const where: { tenantId: string; userId?: string } = { tenantId };
    if (options?.userId) {
      where.userId = options.userId;
    }
    const rows = await prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapPrismaApplicationToRecord);
  }

  async create(
    tenantId: string,
    input: {
      jobId: string;
      resumeId: string;
      userId: string;
      status?: ApplicationStatus;
      atsScore?: number;
      realismScore?: number;
      artifacts?: ApplicationRecord["artifacts"];
    }
  ): Promise<ApplicationRecord> {
    const jobId = resolveOrStableUuid(input.jobId, "job", input.jobId);
    const resumeId = resolveOrStableUuid(input.resumeId, "resume", input.resumeId);
    const userId = resolveOrStableUuid(input.userId, "user", input.userId);

    const row = await prisma.application.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        jobId,
        resumeId,
        status: input.status ?? "Saved",
        appliedAt: new Date(),
        atsScore: input.atsScore ?? 0,
        realismScore: input.realismScore ?? 0,
        resumeDocxPath: input.artifacts?.resumeDocx,
        jdSnapshotPath: input.artifacts?.jdSnapshot,
        coverLetterPath: input.artifacts?.coverLetter
      }
    });
    return mapPrismaApplicationToRecord(row);
  }
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapPrismaJobToListing } from "@/lib/mappers/job-mapper";

export class JobRepository {
  async search(tenantId: string, query: string, domainFilter: string) {
    const q = query.trim();
    const d = domainFilter.trim();

    const where: Prisma.JobWhereInput = { tenantId };
    if (d) {
      where.domain = { equals: d, mode: "insensitive" };
    }
    if (q) {
      const mode = Prisma.QueryMode.insensitive;
      where.OR = [
        { title: { contains: q, mode } },
        { company: { contains: q, mode } },
        { location: { contains: q, mode } },
        { domain: { contains: q, mode } },
        { description: { contains: q, mode } }
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { normalizedScore: "desc" }
    });

    return jobs.map(mapPrismaJobToListing);
  }
}

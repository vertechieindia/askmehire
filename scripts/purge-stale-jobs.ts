import { PrismaClient } from "@prisma/client";
import { INDEXED_JOB_SOURCES } from "../lib/integrations/jobs/types";

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID;
  const where = tenantId
    ? { tenantId, source: { notIn: [...INDEXED_JOB_SOURCES] }  }
    : { source: { notIn: [...INDEXED_JOB_SOURCES] } };

  const staleJobs = await prisma.job.findMany({ where, select: { id: true } });
  const staleJobIds = staleJobs.map((job) => job.id);
  if (staleJobIds.length === 0) {
    console.log("No stale jobs to purge.");
    return;
  }

  const apps = await prisma.application.deleteMany({
    where: tenantId ? { tenantId, jobId: { in: staleJobIds } } : { jobId: { in: staleJobIds } }
  });
  const jobs = await prisma.job.deleteMany({
    where: tenantId ? { tenantId, id: { in: staleJobIds } } : { id: { in: staleJobIds } }
  });

  console.log(`Purged ${jobs.count} stale job(s) and ${apps.count} linked application(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

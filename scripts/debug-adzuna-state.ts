import { PrismaClient } from "@prisma/client";
import { JobRepository } from "../repositories/job.repository";
import { JobConnectorService } from "../services/job-connector.service";

const prisma = new PrismaClient();
const tenantId = process.env.DEFAULT_TENANT_ID ?? "abb9786c-8959-516a-9750-05d508607b84";

async function main() {
  const connectors = await prisma.jobConnector.findMany({
    where: { tenantId },
    select: { portalName: true, status: true, lastSyncedAt: true }
  });
  console.log("connectors", connectors);

  const adzunaCount = await prisma.job.count({ where: { tenantId, source: "Adzuna" } });
  console.log("adzuna jobs in db", adzunaCount);

  const repo = new JobRepository();
  const grouped = await repo.searchGrouped(tenantId, "", "");
  console.log("visible sources", Object.keys(grouped.bySource));
  console.log("adzuna visible", grouped.bySource.Adzuna?.count ?? 0);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

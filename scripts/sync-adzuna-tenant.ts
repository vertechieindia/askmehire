import { PrismaClient } from "@prisma/client";
import { adzunaJobAdapter } from "../lib/integrations/jobs/adzuna.adapter";
import { resolveConnectorCredentialRef } from "../lib/integrations/jobs/connector-env";
import { JobRepository } from "../repositories/job.repository";
import { JobConnectorRepository } from "../repositories/job-connector.repository";

const prisma = new PrismaClient();
const tenantId = process.env.DEFAULT_TENANT_ID ?? "abb9786c-8959-516a-9750-05d508607b84";

async function main() {
  const credRef = resolveConnectorCredentialRef("Adzuna");
  if (!credRef) {
    throw new Error("Adzuna env credentials missing");
  }

  const fetched = await adzunaJobAdapter.sync({
    tenantId,
    portal: "Adzuna",
    query: "",
    keywords: [],
    credentialRef: credRef
  });

  const repo = new JobRepository();
  for (const job of fetched) {
    await repo.upsertConnectorJob(tenantId, job);
  }

  const connectorRepo = new JobConnectorRepository();
  await connectorRepo.markSynced(tenantId, "Adzuna");

  console.log(`Imported ${fetched.length} Adzuna jobs for tenant ${tenantId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

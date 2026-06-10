import { adzunaJobAdapter } from "../lib/integrations/jobs/adzuna.adapter";
import { resolveConnectorCredentialRef } from "../lib/integrations/jobs/connector-env";
import { parseAdzunaCredentials } from "../lib/integrations/jobs/adzuna.client";
import { JobRepository } from "../repositories/job.repository";

const tenantId = process.env.DEFAULT_TENANT_ID ?? "abb9786c-8959-516a-9750-05d508607b84";

async function main() {
  const credRef = resolveConnectorCredentialRef("Adzuna");
  console.log("env creds ok", !!parseAdzunaCredentials(credRef));
  const fetched = await adzunaJobAdapter.sync({
    tenantId,
    portal: "Adzuna",
    query: "",
    keywords: [],
    credentialRef: credRef
  });
  console.log("fetched", fetched.length, fetched[0]?.title);
  const repo = new JobRepository();
  for (const job of fetched.slice(0, 3)) {
    await repo.upsertConnectorJob(tenantId, job);
  }
  console.log("upserted sample 3");
}

main().catch((e) => {
  console.error("SYNC FAIL", e.message);
  process.exitCode = 1;
});

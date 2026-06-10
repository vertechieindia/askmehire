import { PrismaClient } from "@prisma/client";
import { JobRepository } from "../repositories/job.repository";

const prisma = new PrismaClient();
const repo = new JobRepository();
const tenantId = process.env.DEFAULT_TENANT_ID ?? "abb9786c-8959-516a-9750-05d508607b84";

async function main() {
  try {
    const grouped = await repo.searchGrouped(tenantId, "", "");
    console.log("ok", grouped.total, Object.keys(grouped.bySource));
  } catch (err) {
    console.error("ERR", err);
    process.exitCode = 1;
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});

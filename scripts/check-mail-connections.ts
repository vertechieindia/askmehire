import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const gmail = await prisma.gmailConnection.findMany({
    select: { userId: true, gmailAddress: true }
  });
  const outlook = await prisma.outlookConnection.findMany({
    select: { userId: true, outlookAddress: true }
  });
  console.log("gmail_connections", gmail);
  console.log("outlook_connections", outlook);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

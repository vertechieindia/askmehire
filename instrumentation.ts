export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOtelIfConfigured } = await import("./lib/observability/tracing");
    await registerOtelIfConfigured();

    const shutdown = async () => {
      const { prisma } = await import("./lib/prisma");
      if (process.env.REDIS_URL) {
        const { shutdownQueues } = await import("./lib/queue/bullmq-queues");
        await shutdownQueues().catch(() => undefined);
      }
      await prisma.$disconnect().catch(() => undefined);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

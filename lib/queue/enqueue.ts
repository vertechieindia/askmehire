import type { DomainEvent } from "@/events/domain-events";

export async function tryEnqueueDomainEvent(event: DomainEvent): Promise<void> {
  if (!process.env.REDIS_URL) {
    return;
  }
  const { getDefaultJobQueue } = await import("@/lib/queue/bullmq-queues");
  const queue = getDefaultJobQueue();
  await queue.add(
    event.type,
    { ...event },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000
    }
  );
}

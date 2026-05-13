/**
 * BullMQ worker entrypoint for async resume, embedding, connector, export, and email jobs.
 *
 * Run: `REDIS_URL=... DATABASE_URL=... npx tsx workers/index.ts`
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";

const url = process.env.REDIS_URL;
if (!url) {
  // eslint-disable-next-line no-console
  console.error("REDIS_URL is required to start workers.");
  process.exit(1);
}

const connection = new IORedis(url, { maxRetriesPerRequest: null });

const worker = new Worker(
  "askmehire-default",
  async (job) => {
    // eslint-disable-next-line no-console
    console.log("job received", job.name, job.id);
    switch (job.name) {
      case "resume.generated":
      case "jobs.synced":
      case "component.created":
      case "application.created":
        return;
      default:
        return;
    }
  },
  { connection }
);

worker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error("job failed", job?.id, err);
});

// eslint-disable-next-line no-console
console.log("askmehire worker listening on queue askmehire-default");

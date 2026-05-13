import { Queue } from "bullmq";
import IORedis from "ioredis";
import { AppError } from "@/lib/http/api-errors";

const ASKMEHIRE_QUEUE = "askmehire-default";

let sharedConnection: IORedis | null = null;
let defaultQueue: Queue | null = null;

export function getBullMqConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new AppError("QUEUE_CONFIG", "REDIS_URL is not configured.", 503);
  }
  if (!sharedConnection) {
    sharedConnection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return sharedConnection;
}

export function getDefaultJobQueue(): Queue {
  if (!process.env.REDIS_URL) {
    throw new AppError("QUEUE_CONFIG", "REDIS_URL is not configured.", 503);
  }
  if (!defaultQueue) {
    defaultQueue = new Queue(ASKMEHIRE_QUEUE, { connection: getBullMqConnection() });
  }
  return defaultQueue;
}

export async function shutdownQueues(): Promise<void> {
  await defaultQueue?.close();
  defaultQueue = null;
  await sharedConnection?.quit();
  sharedConnection = null;
}

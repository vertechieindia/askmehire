import { RateLimiterMemory } from "rate-limiter-flexible";
import type { ServerEnv } from "@/lib/config/env";
import { RateLimitError } from "@/lib/http/api-errors";

const limiters = new Map<string, RateLimiterMemory>();

function getLimiter(key: string, env: ServerEnv): RateLimiterMemory {
  let lim = limiters.get(key);
  if (!lim) {
    lim = new RateLimiterMemory({
      points: env.RATE_LIMIT_POINTS,
      duration: env.RATE_LIMIT_DURATION_SEC
    });
    limiters.set(key, lim);
  }
  return lim;
}

export async function rateLimitConsume(key: string, env: ServerEnv): Promise<void> {
  const limiter = getLimiter(key, env);
  try {
    await limiter.consume(key, 1);
  } catch {
    throw new RateLimitError();
  }
}

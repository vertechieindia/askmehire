import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().optional(),
    DEFAULT_TENANT_ID: z.string().uuid().optional(),
    AUTH_SECRET: z
      .string()
      .optional()
      .transform((s) => s?.trim()),
    AUTH_DEV_BYPASS: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true"),
    DEV_ACTING_USER_ID: z.string().uuid().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    AWS_REGION: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().url().optional(),
    RATE_LIMIT_ENABLED: z
      .string()
      .optional()
      .transform((v) => v !== "0" && v !== "false"),
    RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(120),
    RATE_LIMIT_DURATION_SEC: z.coerce.number().int().positive().default(60),
    TRUST_PROXY: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true")
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.AUTH_SECRET || data.AUTH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "AUTH_SECRET is required and must be at least 32 characters in production.",
          path: ["AUTH_SECRET"]
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DEV_BYPASS: process.env.AUTH_DEV_BYPASS,
    DEV_ACTING_USER_ID: process.env.DEV_ACTING_USER_ID,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    RATE_LIMIT_POINTS: process.env.RATE_LIMIT_POINTS,
    RATE_LIMIT_DURATION_SEC: process.env.RATE_LIMIT_DURATION_SEC,
    TRUST_PROXY: process.env.TRUST_PROXY
  });
  if (!parsed.success) {
    const detail = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment configuration: ${JSON.stringify(detail)}`);
  }
  cached = {
    ...parsed.data,
    RATE_LIMIT_ENABLED: parsed.data.RATE_LIMIT_ENABLED ?? true
  };
  return cached;
}

export function resetEnvCacheForTests() {
  cached = null;
}

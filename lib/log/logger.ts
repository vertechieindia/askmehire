import pino from "pino";

const base = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "askmehire" }
});

export type AppLogger = pino.Logger;

export function createLogger(bindings: Record<string, string | undefined>): AppLogger {
  return base.child(bindings);
}

export const rootLogger = base;

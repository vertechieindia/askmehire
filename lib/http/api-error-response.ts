import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { errEnvelope } from "@/lib/http/api-envelope";
import { AppError, RateLimitError } from "@/lib/http/api-errors";
import type { AppLogger } from "@/lib/log/logger";

const INTERNAL_ERROR_MESSAGE = "An unexpected error occurred. Please try again later.";

export function toApiErrorResponse(error: unknown, requestId: string, logger: AppLogger): NextResponse {
  if (error instanceof ZodError) {
    const body = errEnvelope("VALIDATION_ERROR", "Request validation failed", requestId, error.flatten());
    return NextResponse.json(body, { status: 400, headers: { "x-request-id": requestId } });
  }
  if (error instanceof RateLimitError) {
    const body = errEnvelope(error.code, error.message, requestId);
    return NextResponse.json(body, {
      status: 429,
      headers: { "x-request-id": requestId, "retry-after": "60" }
    });
  }
  if (error instanceof AppError) {
    const body = errEnvelope(error.code, error.message, requestId, error.details);
    return NextResponse.json(body, { status: error.status, headers: { "x-request-id": requestId } });
  }
  logger.error({ err: error }, "Unhandled API error");
  const body = errEnvelope("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, requestId);
  return NextResponse.json(body, { status: 500, headers: { "x-request-id": requestId } });
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toApiErrorResponse } from "@/lib/http/api-error-response";
import { okEnvelope } from "@/lib/http/api-envelope";
import { AppError } from "@/lib/http/api-errors";
import type { ServerEnv } from "@/lib/config/env";
import type { AppLogger } from "@/lib/log/logger";
import { createLogger } from "@/lib/log/logger";
import { getClientIp } from "@/lib/http/client-ip";
import { getServerEnv } from "@/lib/config/env";
import { rateLimitConsume } from "@/lib/middleware/rate-limit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { writeAuditEvent } from "@/lib/auth/audit";
import { portalUserUuid } from "@/lib/ids/stable-uuid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { toApiErrorResponse } from "@/lib/http/api-error-response";

export type ApiContext = {
  requestId: string;
  logger: AppLogger;
  tenantId: string;
  userId: string;
  actorUserId: string;
  role: string;
  impersonating: boolean;
};

export type ApiContextWithEnv = ApiContext & { env: ServerEnv };

export type ApiHandler<T> = (request: Request, ctx: ApiContextWithEnv) => Promise<T>;

function readRequestId(request: Request): string {
  return request.headers.get("x-request-id")?.trim() || randomUUID();
}

export async function prepareApiContext(request: Request): Promise<ApiContextWithEnv> {
  const env = getServerEnv();
  const requestId = readRequestId(request);
  const session = await auth();

  const bypass =
    env.AUTH_DEV_BYPASS && (env.NODE_ENV === "development" || env.NODE_ENV === "test");

  let actorUserId: string;
  let actorRole: string;
  let sessionTenantId: string | null;

  if (session?.user?.id) {
    actorUserId = session.user.id;
    actorRole = session.user.role;
    sessionTenantId = session.user.tenantId;
  } else if (bypass) {
    const actingId = env.DEV_ACTING_USER_ID ?? portalUserUuid("user-super");
    const acting = await prisma.user.findUnique({
      where: { id: actingId },
      select: { id: true, role: true, tenantId: true }
    });
    if (!acting) {
      throw new AppError(
        "DEV_ACTING_USER_MISSING",
        "AUTH_DEV_BYPASS is enabled but the acting user was not found in the database.",
        500
      );
    }
    actorUserId = acting.id;
    actorRole = acting.role;
    sessionTenantId = acting.tenantId;
  } else {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  let userId = actorUserId;
  let tenantId = sessionTenantId ?? env.DEFAULT_TENANT_ID ?? null;
  let impersonating = false;

  const impHeader = request.headers.get("x-impersonate-user-id")?.trim();
  if (impHeader) {
    if (!UUID_RE.test(impHeader)) {
      throw new AppError("INVALID_IMPERSONATION", "x-impersonate-user-id must be a UUID.", 400);
    }
    requirePermission(actorRole, "impersonation:read");
    const target = await prisma.user.findUnique({
      where: { id: impHeader },
      select: { id: true, tenantId: true }
    });
    if (!target) {
      throw new AppError("IMPERSONATION_TARGET_NOT_FOUND", "Impersonation target user was not found.", 404);
    }
    userId = target.id;
    tenantId = target.tenantId ?? env.DEFAULT_TENANT_ID ?? null;
    impersonating = true;
    const auditTenant = tenantId;
    if (auditTenant) {
      await writeAuditEvent({
        tenantId: auditTenant,
        actorId: actorUserId,
        action: "auth.impersonation.effective",
        entityType: "user",
        entityId: userId,
        payload: { targetUserId: userId },
        severity: "warning"
      });
    }
  }

  if (!tenantId || !UUID_RE.test(tenantId)) {
    throw new AppError("TENANT_REQUIRED", "A tenant context could not be resolved for this request.", 400);
  }

  const logger = createLogger({
    requestId,
    tenantId,
    userId,
    actorUserId,
    impersonating: impersonating ? "1" : "0"
  });
  return { requestId, tenantId, logger, env, userId, actorUserId, role: actorRole, impersonating };
}

export async function enforceRateLimit(
  ctx: ApiContextWithEnv,
  request: Request,
  rateLimitKey: string
): Promise<void> {
  if (ctx.env.RATE_LIMIT_ENABLED) {
    const ip = getClientIp(request, ctx.env.TRUST_PROXY ?? false);
    await rateLimitConsume(`${rateLimitKey}:${ip}`, ctx.env);
  }
}

export async function handleJsonApi<T>(
  request: Request,
  handler: ApiHandler<T>,
  options?: { rateLimitKey?: string }
): Promise<NextResponse> {
  let ctx: ApiContextWithEnv | null = null;
  try {
    ctx = await prepareApiContext(request);
    if (options?.rateLimitKey) {
      await enforceRateLimit(ctx, request, options.rateLimitKey);
    }

    const result = await handler(request, ctx);
    const body = okEnvelope(result, ctx.requestId);
    return NextResponse.json(body, {
      status: 200,
      headers: {
        "x-request-id": ctx.requestId,
        "x-tenant-id": ctx.tenantId
      }
    });
  } catch (error) {
    const requestId = ctx?.requestId ?? readRequestId(request);
    const logger = ctx?.logger ?? createLogger({ requestId });
    return toApiErrorResponse(error, requestId, logger);
  }
}

export async function parseJsonBody<T>(request: Request, schema: { parse: (data: unknown) => T }): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new AppError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  return schema.parse(json);
}

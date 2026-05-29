import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { errEnvelope } from "@/lib/http/api-envelope";

/** NextAuth v5 uses __Secure- prefixed session cookies on HTTPS (production). */
function sessionJwtCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction ? "__Secure-authjs.session-token" : "authjs.session-token";
  return {
    secureCookie: isProduction,
    cookieName,
    salt: cookieName
  } as const;
}

function securityHeaders(requestId: string): Record<string, string> {
  return {
    "x-request-id": requestId,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
}

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || globalThis.crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  const headers = securityHeaders(requestId);

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/health")) {
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(headers)) {
      response.headers.set(k, v);
    }
    return response;
  }

  const bypass =
    (process.env.AUTH_DEV_BYPASS === "1" || process.env.AUTH_DEV_BYPASS === "true") &&
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");

  if (pathname.startsWith("/api/") && !bypass) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(errEnvelope("SERVER_MISCONFIG", "AUTH_SECRET is not set.", requestId), {
        status: 500,
        headers
      });
    }
    const token = await getToken({
      req: request,
      secret,
      ...sessionJwtCookieOptions()
    });
    if (!token?.sub) {
      return NextResponse.json(errEnvelope("UNAUTHORIZED", "Authentication required.", requestId), {
        status: 401,
        headers
      });
    }
  }

  const response = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};

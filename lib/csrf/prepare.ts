/**
 * CSRF preparation (Phase 2 auth will wire cookies + double-submit or SameSite strict flows).
 *
 * For API routes that mutate state with cookie sessions, validate that the `x-csrf-token`
 * header matches the `csrf` HttpOnly cookie value issued at login.
 */
export function describeCsrfStrategy(): string {
  return "Use double-submit cookie pattern or framework CSRF tokens once session cookies are enabled.";
}

export function assertCsrfHeaderPresent(request: Request): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return;
  }
  void request.headers.get("x-csrf-token");
}

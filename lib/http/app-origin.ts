/**
 * Public browser origin for redirects (e.g. OAuth callbacks).
 * Behind nginx → Node, `request.url` often uses localhost:PORT; use AUTH_URL / NEXTAUTH_URL instead.
 */
export function getAppPublicOrigin(request?: Request): string {
  const configured =
    process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (
    request &&
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
  ) {
    return new URL(request.url).origin;
  }
  throw new Error(
    "AUTH_URL or NEXTAUTH_URL must be set for OAuth redirects in production."
  );
}

export function appRedirectUrl(pathAndQuery: string, request?: Request): URL {
  return new URL(pathAndQuery, `${getAppPublicOrigin(request)}/`);
}

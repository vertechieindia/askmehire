export function getClientIp(request: Request, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
      return xff.split(",")[0]?.trim() || "unknown";
    }
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/User.Read"
] as const;

export type OutlookOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId: string;
};

export function getOutlookOAuthConfig(): OutlookOAuthConfig | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI?.trim() ||
    (process.env.AUTH_URL?.trim()
      ? `${process.env.AUTH_URL.replace(/\/$/, "")}/api/integrations/outlook/callback`
      : process.env.NEXTAUTH_URL?.trim()
        ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/integrations/outlook/callback`
        : "");
  if (!redirectUri) {
    return null;
  }
  const tenantId = process.env.MICROSOFT_TENANT_ID?.trim() || "common";
  return { clientId, clientSecret, redirectUri, tenantId };
}

export function getOutlookTokenEncryptionKey(): string {
  const dedicated = process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY?.trim();
  if (dedicated && dedicated.length >= 32) {
    return dedicated.slice(0, 32);
  }
  const gmailKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim();
  if (gmailKey && gmailKey.length >= 32) {
    return gmailKey.slice(0, 32);
  }
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (authSecret && authSecret.length >= 32) {
    return authSecret.slice(0, 32);
  }
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return "dev-only-gmail-token-key-32b!";
  }
  throw new Error("OUTLOOK_TOKEN_ENCRYPTION_KEY, GMAIL_TOKEN_ENCRYPTION_KEY, or AUTH_SECRET (32+ chars) is required for Outlook token storage.");
}

export function getOutlookOAuthBaseUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
}

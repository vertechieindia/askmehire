export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email"
] as const;

export type GmailOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getGmailOAuthConfig(): GmailOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    (process.env.AUTH_URL?.trim()
      ? `${process.env.AUTH_URL.replace(/\/$/, "")}/api/integrations/gmail/callback`
      : process.env.NEXTAUTH_URL?.trim()
        ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/integrations/gmail/callback`
        : "");
  if (!redirectUri) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

export function getGmailTokenEncryptionKey(): string {
  const dedicated = process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim();
  if (dedicated && dedicated.length >= 32) {
    return dedicated.slice(0, 32);
  }
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (authSecret && authSecret.length >= 32) {
    return authSecret.slice(0, 32);
  }
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return "dev-only-gmail-token-key-32b!";
  }
  throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY or AUTH_SECRET (32+ chars) is required for Gmail token storage.");
}

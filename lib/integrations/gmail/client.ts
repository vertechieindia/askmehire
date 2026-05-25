import { google } from "googleapis";
import { GMAIL_SCOPES, getGmailOAuthConfig } from "@/lib/integrations/gmail/config";
import { decryptSecret } from "@/lib/integrations/gmail/token-crypto";

export function createOAuth2Client() {
  const config = getGmailOAuthConfig();
  if (!config) {
    throw new Error("Gmail OAuth is not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirect URI).");
  }
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function getGmailAuthorizeUrl(state: string): string {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GMAIL_SCOPES],
    state
  });
}

export async function exchangeGmailCode(code: string) {
  const oauth2 = createOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke app access and connect again.");
  }
  oauth2.setCredentials(tokens);
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
  const profile = await oauth2Api.userinfo.get();
  const gmailAddress = profile.data.email;
  if (!gmailAddress) {
    throw new Error("Could not read Gmail address from Google profile.");
  }
  return {
    gmailAddress,
    refreshToken: tokens.refresh_token,
    historyId: tokens.scope ? undefined : undefined
  };
}

export function gmailClientFromRefreshToken(refreshTokenEncrypted: string) {
  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({ refresh_token: decryptSecret(refreshTokenEncrypted) });
  return google.gmail({ version: "v1", auth: oauth2 });
}

function decodeBody(data?: string | null): string {
  if (!data) {
    return "";
  }
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractPlainText(payload: { mimeType?: string | null; body?: { data?: string | null }; parts?: unknown[] }): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBody(payload.body.data).slice(0, 4000);
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractPlainText(part as typeof payload);
      if (text) {
        return text;
      }
    }
  }
  if (payload.body?.data) {
    return decodeBody(payload.body.data).slice(0, 4000);
  }
  return "";
}

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  bodyText: string;
  internalDate: number;
};

export async function listRecentMessages(
  gmail: ReturnType<typeof google.gmail>,
  query: string,
  maxResults = 15
): Promise<GmailMessageSummary[]> {
  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults
  });
  const ids = list.data.messages ?? [];
  const summaries: GmailMessageSummary[] = [];
  for (const item of ids) {
    if (!item.id) {
      continue;
    }
    const full = await gmail.users.messages.get({ userId: "me", id: item.id, format: "full" });
    const headers = full.data.payload?.headers ?? [];
    const header = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
    summaries.push({
      id: item.id,
      threadId: full.data.threadId ?? item.id,
      subject: header("Subject") || "(no subject)",
      from: header("From"),
      to: header("To"),
      snippet: full.data.snippet ?? "",
      bodyText: extractPlainText(full.data.payload ?? {}),
      internalDate: Number(full.data.internalDate ?? 0)
    });
  }
  return summaries;
}

export async function sendGmailMessage(
  gmail: ReturnType<typeof google.gmail>,
  opts: { to: string; subject: string; body: string; threadId?: string }
): Promise<{ id: string; threadId: string }> {
  const lines = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.body
  ];
  const raw = Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: opts.threadId
    }
  });
  return {
    id: res.data.id ?? "",
    threadId: res.data.threadId ?? opts.threadId ?? ""
  };
}

import {
  getOutlookOAuthBaseUrl,
  getOutlookOAuthConfig,
  OUTLOOK_SCOPES,
  type OutlookOAuthConfig
} from "@/lib/integrations/outlook/config";
import { decryptSecret } from "@/lib/integrations/outlook/token-crypto";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

function requireConfig(): OutlookOAuthConfig {
  const config = getOutlookOAuthConfig();
  if (!config) {
    throw new Error("Outlook OAuth is not configured (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, redirect URI).");
  }
  return config;
}

export function getOutlookAuthorizeUrl(state: string): string {
  const config = requireConfig();
  const base = getOutlookOAuthBaseUrl(config.tenantId);
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: OUTLOOK_SCOPES.join(" "),
    state,
    prompt: "consent"
  });
  return `${base}/authorize?${params.toString()}`;
}

async function fetchTokens(body: Record<string, string>): Promise<TokenResponse> {
  const config = requireConfig();
  const base = getOutlookOAuthBaseUrl(config.tenantId);
  const res = await fetch(`${base}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft token error: ${text.slice(0, 400)}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function exchangeOutlookCode(code: string) {
  const tokens = await fetchTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: requireConfig().redirectUri
  });
  if (!tokens.refresh_token) {
    throw new Error("Microsoft did not return a refresh token. Revoke app access and connect again.");
  }
  const profile = await graphGet<{ mail?: string; userPrincipalName?: string }>("/me", tokens.access_token, {
    $select: "mail,userPrincipalName"
  });
  const outlookAddress = profile.mail || profile.userPrincipalName;
  if (!outlookAddress) {
    throw new Error("Could not read Outlook address from Microsoft profile.");
  }
  return {
    outlookAddress,
    refreshToken: tokens.refresh_token
  };
}

export async function getOutlookAccessToken(refreshTokenEncrypted: string): Promise<string> {
  const refreshToken = decryptSecret(refreshTokenEncrypted);
  const tokens = await fetchTokens({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  return tokens.access_token;
}

async function graphGet<T>(
  path: string,
  accessToken: string,
  query?: Record<string, string>
): Promise<T> {
  const url = new URL(`https://graph.microsoft.com/v1.0${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph error (${res.status}): ${text.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

async function graphPost<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph error (${res.status}): ${text.slice(0, 400)}`);
  }
  if (res.status === 202 || res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

async function graphPatch(path: string, accessToken: string, body: unknown): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph error (${res.status}): ${text.slice(0, 400)}`);
  }
}

type GraphMessage = {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  from?: { emailAddress?: { address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  body?: { content?: string };
  receivedDateTime?: string;
};

export type OutlookMessageSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  bodyText: string;
  internalDate: number;
};

function mapGraphMessage(msg: GraphMessage): OutlookMessageSummary {
  const from = msg.from?.emailAddress?.address ?? "";
  const to = (msg.toRecipients ?? []).map((r) => r.emailAddress?.address ?? "").filter(Boolean).join(", ");
  return {
    id: msg.id,
    threadId: msg.conversationId ?? msg.id,
    subject: msg.subject || "(no subject)",
    from,
    to,
    snippet: msg.bodyPreview ?? "",
    bodyText: (msg.body?.content ?? msg.bodyPreview ?? "").slice(0, 4000),
    internalDate: msg.receivedDateTime ? Date.parse(msg.receivedDateTime) : 0
  };
}

function sinceIso14Days(): string {
  return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
}

function messageMatchesContact(msg: GraphMessage, email: string): boolean {
  const normalized = email.toLowerCase();
  const from = msg.from?.emailAddress?.address?.toLowerCase() ?? "";
  if (from === normalized) {
    return true;
  }
  return (msg.toRecipients ?? []).some((r) => r.emailAddress?.address?.toLowerCase() === normalized);
}

export async function listRecentMessages(
  accessToken: string,
  contactEmail: string,
  maxResults = 8
): Promise<OutlookMessageSummary[]> {
  const since = sinceIso14Days();
  const data = await graphGet<{ value: GraphMessage[] }>("/me/messages", accessToken, {
    $filter: `receivedDateTime ge ${since}`,
    $orderby: "receivedDateTime desc",
    $top: String(Math.min(maxResults * 4, 50)),
    $select: "id,conversationId,subject,bodyPreview,from,toRecipients,body,receivedDateTime"
  });
  return (data.value ?? [])
    .filter((msg) => messageMatchesContact(msg, contactEmail))
    .slice(0, maxResults)
    .map(mapGraphMessage);
}

export async function listConversationMessages(
  accessToken: string,
  conversationId: string,
  maxResults = 5
): Promise<OutlookMessageSummary[]> {
  const data = await graphGet<{ value: GraphMessage[] }>("/me/messages", accessToken, {
    $filter: `conversationId eq '${conversationId.replace(/'/g, "''")}'`,
    $orderby: "receivedDateTime desc",
    $top: String(maxResults),
    $select: "id,conversationId,subject,bodyPreview,from,toRecipients,body,receivedDateTime"
  });
  return (data.value ?? []).map(mapGraphMessage);
}

export async function sendOutlookMessage(
  accessToken: string,
  opts: { to: string; subject: string; body: string; conversationId?: string }
): Promise<{ id: string; threadId: string }> {
  if (opts.conversationId) {
    const data = await graphGet<{ value: GraphMessage[] }>("/me/messages", accessToken, {
      $filter: `conversationId eq '${opts.conversationId.replace(/'/g, "''")}'`,
      $orderby: "receivedDateTime desc",
      $top: "1",
      $select: "id,conversationId"
    });
    const messageId = data.value?.[0]?.id;
    if (messageId) {
      const draft = await graphPost<{ id: string }>(`/me/messages/${messageId}/createReply`, accessToken, {});
      if (draft.id) {
        await graphPatch(`/me/messages/${draft.id}`, accessToken, {
          body: { contentType: "Text", content: opts.body }
        });
        await graphPost(`/me/messages/${draft.id}/send`, accessToken);
        return { id: draft.id, threadId: opts.conversationId };
      }
    }
  }

  await graphPost("/me/sendMail", accessToken, {
    message: {
      subject: opts.subject,
      body: { contentType: "Text", content: opts.body },
      toRecipients: [{ emailAddress: { address: opts.to } }]
    },
    saveToSentItems: true
  });
  return { id: "", threadId: opts.conversationId ?? "" };
}

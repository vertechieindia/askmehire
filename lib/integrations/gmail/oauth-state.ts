import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  userId: string;
  tenantId: string | null;
  nonce: string;
  exp: number;
};

function stateSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is required to sign Gmail OAuth state.");
  }
  return secret;
}

export function createGmailOAuthState(userId: string, tenantId: string | null): string {
  const payload: OAuthStatePayload = {
    userId,
    tenantId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGmailOAuthState(state: string): OAuthStatePayload {
  const [body, sig] = state.split(".");
  if (!body || !sig) {
    throw new Error("Invalid OAuth state.");
  }
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature.");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
  if (!payload.userId || !payload.exp || Date.now() > payload.exp) {
    throw new Error("OAuth state expired.");
  }
  return payload;
}

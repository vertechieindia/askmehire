import { NextResponse } from "next/server";
import { prepareApiContext } from "@/lib/http/with-api-handler";
import { GmailService } from "@/services/gmail.service";

const gmailService = new GmailService();

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const params = new URL(request.url).searchParams;
  const oauthError = params.get("error");
  if (oauthError) {
    return NextResponse.redirect(`${origin}/?mail=gmail_denied`);
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/?mail=gmail_error&message=missing_code`);
  }
  try {
    const ctx = await prepareApiContext(request);
    await gmailService.handleCallback(code, state, ctx.userId);
    return NextResponse.redirect(`${origin}/?mail=gmail_connected`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail callback failed.";
    return NextResponse.redirect(`${origin}/?mail=gmail_error&message=${encodeURIComponent(message)}`);
  }
}

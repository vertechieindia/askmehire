import { NextResponse } from "next/server";
import { prepareApiContext } from "@/lib/http/with-api-handler";
import { appRedirectUrl } from "@/lib/http/app-origin";
import { GmailService } from "@/services/gmail.service";

const gmailService = new GmailService();

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const oauthError = params.get("error");
  if (oauthError) {
    return NextResponse.redirect(appRedirectUrl("/?tab=mail&mail=gmail_denied", request));
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return NextResponse.redirect(
      appRedirectUrl("/?tab=mail&mail=gmail_error&message=missing_code", request)
    );
  }
  try {
    const ctx = await prepareApiContext(request);
    await gmailService.handleCallback(code, state, ctx.userId);
    return NextResponse.redirect(appRedirectUrl("/?tab=mail&mail=gmail_connected", request));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail callback failed.";
    return NextResponse.redirect(
      appRedirectUrl(
        `/?tab=mail&mail=gmail_error&message=${encodeURIComponent(message)}`,
        request
      )
    );
  }
}

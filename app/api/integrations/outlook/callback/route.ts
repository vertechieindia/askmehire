import { NextResponse } from "next/server";
import { prepareApiContext } from "@/lib/http/with-api-handler";
import { OutlookService } from "@/services/outlook.service";

const outlookService = new OutlookService();

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const params = new URL(request.url).searchParams;
  const oauthError = params.get("error");
  if (oauthError) {
    return NextResponse.redirect(`${origin}/?tab=mail&mail=outlook_denied`);
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/?tab=mail&mail=outlook_error&message=missing_code`);
  }
  try {
    const ctx = await prepareApiContext(request);
    await outlookService.handleCallback(code, state, ctx.userId);
    return NextResponse.redirect(`${origin}/?tab=mail&mail=outlook_connected`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outlook callback failed.";
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[outlook/callback]", message, error);
    }
    return NextResponse.redirect(`${origin}/?tab=mail&mail=outlook_error&message=${encodeURIComponent(message)}`);
  }
}

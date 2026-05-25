import { NextResponse } from "next/server";
import { prepareApiContext } from "@/lib/http/with-api-handler";
import { requirePermission } from "@/lib/auth/rbac";
import { GmailService } from "@/services/gmail.service";

const gmailService = new GmailService();

export async function GET(request: Request) {
  try {
    const ctx = await prepareApiContext(request);
    requirePermission(ctx.role, "email:draft");
    const url = gmailService.getConnectUrl(ctx);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail connect failed.";
    return NextResponse.redirect(new URL(`/?mail=gmail_error&message=${encodeURIComponent(message)}`, request.url));
  }
}

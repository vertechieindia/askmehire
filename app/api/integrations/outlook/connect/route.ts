import { NextResponse } from "next/server";
import { appRedirectUrl } from "@/lib/http/app-origin";
import { prepareApiContext } from "@/lib/http/with-api-handler";
import { requirePermission } from "@/lib/auth/rbac";
import { OutlookService } from "@/services/outlook.service";

const outlookService = new OutlookService();

export async function GET(request: Request) {
  try {
    const ctx = await prepareApiContext(request);
    requirePermission(ctx.role, "email:draft");
    const url = outlookService.getConnectUrl(ctx);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outlook connect failed.";
    return NextResponse.redirect(
      appRedirectUrl(`/?tab=mail&mail=outlook_error&message=${encodeURIComponent(message)}`, request)
    );
  }
}

import { handleJsonApi } from "@/lib/http/with-api-handler";
import { OutlookService } from "@/services/outlook.service";

const outlookService = new OutlookService();

export async function GET(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => outlookService.getStatus(ctx.userId),
    { rateLimitKey: "api:outlook:status" }
  );
}

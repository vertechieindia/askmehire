import { handleJsonApi } from "@/lib/http/with-api-handler";
import { OutlookService } from "@/services/outlook.service";

const outlookService = new OutlookService();

export async function DELETE(request: Request) {
  return handleJsonApi(
    request,
    async (_req, ctx) => outlookService.disconnect(ctx.userId),
    { rateLimitKey: "api:outlook:disconnect" }
  );
}

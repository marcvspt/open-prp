import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/server/api-helpers.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";

const repo = new ShoppingRepository();

export const POST: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("invalid-body", 400);
  if (!body.id) return errorResponse("id-required");

  const item = await repo.toggleCheck(body.id as string, uid);
  if (!item) return errorResponse("not-found", 404);

  return jsonResponse(item);
});

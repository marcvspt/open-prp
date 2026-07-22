import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";

const repo = new ShoppingRepository();

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.id) return errorResponse("id is required");

  const item = await repo.toggleCheck(body.id, uid);
  if (!item) return errorResponse("Not found", 404);

  return jsonResponse(item);
};

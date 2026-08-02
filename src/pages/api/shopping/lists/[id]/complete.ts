import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { ShoppingListRepository } from "@/lib/modules/shopping/lists.ts";

const repo = new ShoppingListRepository();

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const list = await repo.complete(context.params.id!, uid);
  if (!list) return errorResponse("Not found", 404);

  return jsonResponse(list);
};

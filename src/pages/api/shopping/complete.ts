import type { APIRoute } from "astro";
import { jsonResponse, requireUserId } from "@/lib/api-helpers.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";

const repo = new ShoppingRepository();

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const count = await repo.completeAllChecked(uid);
  return jsonResponse({ completed: count });
};

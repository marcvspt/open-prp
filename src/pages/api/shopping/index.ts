import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";

const repo = new ShoppingRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const items = await repo.findAll(uid, {
    is_checked: params.is_checked === "true" ? true : params.is_checked === "false" ? false : undefined,
    is_completed: params.is_completed === "true" ? true : params.is_completed === "false" ? false : undefined,
    category: params.category,
    event_id: params.event_id,
  });

  return jsonResponse(items);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name) {
    return errorResponse("name is required");
  }

  const item = await repo.create(body, uid);
  return jsonResponse(item, 201);
};

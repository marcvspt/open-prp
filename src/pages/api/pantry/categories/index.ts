import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers";
import { PantryCategoryRepository } from "@/lib/modules/pantry/categories";

const repo = new PantryCategoryRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const items = await repo.findAll(uid, params.family_id);
  return jsonResponse(items);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name) return errorResponse("name is required");

  const item = await repo.create(body, uid);
  return jsonResponse(item, 201);
};

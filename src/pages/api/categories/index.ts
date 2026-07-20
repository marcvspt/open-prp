import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers";
import { CategoryRepository } from "@/lib/modules/transactions/categories";

const repo = new CategoryRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const categories = await repo.findAll(uid, params.type as "income" | "expense" | undefined, params.family_id);

  return jsonResponse(categories);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name || !body.type) {
    return errorResponse("name and type are required");
  }

  const category = await repo.create(body, uid);
  return jsonResponse(category, 201);
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";

const repo = new CategoryRepository();

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const category = await repo.update(context.params.id!, body, uid);
  if (!category) return errorResponse("Not found", 404);

  return jsonResponse(category);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const category = await repo.update(context.params.id!, body, uid);
  if (!category) return errorResponse("Not found", 404);

  return jsonResponse(category);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};

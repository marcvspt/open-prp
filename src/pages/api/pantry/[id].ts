import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { PantryRepository } from "@/lib/modules/pantry/repository";

const repo = new PantryRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const item = await repo.findById(context.params.id!, uid);
  if (!item) return errorResponse("Not found", 404);
  return jsonResponse(item);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const item = await repo.update(context.params.id!, body, uid);
  if (!item) return errorResponse("Not found", 404);
  return jsonResponse(item);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const ok = await repo.delete(context.params.id!, uid);
  if (!ok) return errorResponse("Not found", 404);
  return jsonResponse({ deleted: true });
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";

const repo = new CardRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const card = await repo.findById(context.params.id!, uid);
  if (!card) return errorResponse("Not found", 404);

  return jsonResponse(card);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const card = await repo.update(context.params.id!, body, uid);
  if (!card) return errorResponse("Not found", 404);

  return jsonResponse(card);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const card = await repo.update(context.params.id!, body, uid);
  if (!card) return errorResponse("Not found", 404);

  return jsonResponse(card);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};

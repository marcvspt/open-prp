import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { EventRepository } from "@/lib/modules/events/repository.ts";

const repo = new EventRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const event = await repo.findById(context.params.id!, uid);
  if (!event) return errorResponse("Not found", 404);

  return jsonResponse(event);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const event = await repo.update(context.params.id!, body, uid);
  if (!event) return errorResponse("Not found", 404);

  return jsonResponse(event);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const event = await repo.update(context.params.id!, body, uid);
  if (!event) return errorResponse("Not found", 404);

  return jsonResponse(event);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { ServiceRepository } from "@/lib/modules/services/repository";

const repo = new ServiceRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const service = await repo.findById(context.params.id!, uid);
  if (!service) return errorResponse("Not found", 404);

  return jsonResponse(service);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const service = await repo.update(context.params.id!, body, uid);
  if (!service) return errorResponse("Not found", 404);

  return jsonResponse(service);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const service = await repo.update(context.params.id!, body, uid);
  if (!service) return errorResponse("Not found", 404);

  return jsonResponse(service);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};

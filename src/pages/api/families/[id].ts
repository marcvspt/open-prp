import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { FamilyRepository } from "@/lib/modules/families/repository";

const repo = new FamilyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role) return errorResponse("Not found or access denied", 404);

  const family = await repo.findById(context.params.id!);
  if (!family) return errorResponse("Not found", 404);

  return jsonResponse(family);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role || role !== "admin") return errorResponse("Forbidden", 403);

  const body = await context.request.json();
  const family = await repo.update(context.params.id!, body);
  if (!family) return errorResponse("Not found", 404);

  return jsonResponse(family);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role || role !== "admin") return errorResponse("Forbidden", 403);

  const body = await context.request.json();
  const family = await repo.update(context.params.id!, body);
  if (!family) return errorResponse("Not found", 404);

  return jsonResponse(family);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role || role !== "admin") return errorResponse("Forbidden", 403);

  const deleted = await repo.delete(context.params.id!);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};

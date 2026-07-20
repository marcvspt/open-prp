import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { FamilyRepository } from "@/lib/modules/families/repository";

const repo = new FamilyRepository();

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role || role !== "admin") return errorResponse("Forbidden", 403);

  const body = await context.request.json();
  if (!body.role) {
    return errorResponse("role is required");
  }

  const updated = await repo.updateMemberRole(context.params.id!, context.params.userId!, body.role);
  if (!updated) return errorResponse("Member not found", 404);

  return jsonResponse({ updated: true });
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role || role !== "admin") return errorResponse("Forbidden", 403);

  const body = await context.request.json();
  if (!body.role) {
    return errorResponse("role is required");
  }

  const updated = await repo.updateMemberRole(context.params.id!, context.params.userId!, body.role);
  if (!updated) return errorResponse("Member not found", 404);

  return jsonResponse({ updated: true });
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role || role !== "admin") return errorResponse("Forbidden", 403);

  const removed = await repo.removeMember(context.params.id!, context.params.userId!);
  if (!removed) return errorResponse("Member not found", 404);

  return jsonResponse({ deleted: true });
};

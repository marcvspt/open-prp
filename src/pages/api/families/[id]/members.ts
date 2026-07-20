import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { FamilyRepository } from "@/lib/modules/families/repository";

const repo = new FamilyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role) return errorResponse("Not found or access denied", 404);

  const members = await repo.getMembers(context.params.id!);
  return jsonResponse(members);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const role = await repo.getUserRole(context.params.id!, uid);
  if (!role || role !== "admin") return errorResponse("Forbidden", 403);

  const body = await context.request.json();
  if (!body.user_id) {
    return errorResponse("user_id is required");
  }

  const member = await repo.addMember(context.params.id!, body.user_id, body.role ?? "member");
  return jsonResponse(member, 201);
};

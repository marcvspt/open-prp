import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { FamilyRepository } from "@/lib/modules/families/repository";

const repo = new FamilyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const families = await repo.findAllByUser(uid);
  return jsonResponse(families);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name) {
    return errorResponse("name is required");
  }

  const family = await repo.create(body, uid);
  return jsonResponse(family, 201);
};

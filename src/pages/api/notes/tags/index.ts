import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { NoteTagRepository } from "@/lib/modules/notes/tags";

const repo = new NoteTagRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const tags = await repo.findAll(uid);
  return jsonResponse(tags);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name) {
    return errorResponse("name is required");
  }

  const tag = await repo.create(uid, body.name, body.color, body.family_id);
  return jsonResponse(tag, 201);
};

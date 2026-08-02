import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { NoteTagRepository } from "@/lib/modules/notes/tags.ts";

const repo = new NoteTagRepository();

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const tags = await repo.findAll(uid);
  return jsonResponse(tags);
});

export const POST: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);
  if (!body.name) {
    return errorResponse("name is required");
  }

  const tag = await repo.create(uid, body.name as string, body.color as string | undefined);
  return jsonResponse(tag, 201);
});

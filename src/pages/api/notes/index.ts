import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams, parsePageParams } from "@/lib/api-helpers.ts";
import { NoteRepository } from "@/lib/modules/notes/repository.ts";

const repo = new NoteRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const { page, pageSize } = parsePageParams(context.url);

  const result = await repo.findAll(uid, {
    is_pinned: params.is_pinned === "true" ? true : params.is_pinned === "false" ? false : undefined,
    tag_id: params.tag_id,
    page,
    pageSize,
  });

  return jsonResponse(result);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.title) {
    return errorResponse("title is required");
  }

  const note = await repo.create(body, uid);
  return jsonResponse(note, 201);
};

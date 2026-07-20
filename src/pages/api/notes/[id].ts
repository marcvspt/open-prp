import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { NoteRepository } from "@/lib/modules/notes/repository";

const repo = new NoteRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const note = await repo.findById(context.params.id!, uid);
  if (!note) return errorResponse("Not found", 404);

  return jsonResponse(note);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const note = await repo.update(context.params.id!, body, uid);
  if (!note) return errorResponse("Not found", 404);

  return jsonResponse(note);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const note = await repo.update(context.params.id!, body, uid);
  if (!note) return errorResponse("Not found", 404);

  return jsonResponse(note);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};

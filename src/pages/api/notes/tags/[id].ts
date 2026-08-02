import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, withErrorHandling } from "@/lib/api-helpers.ts";
import { NoteTagRepository } from "@/lib/modules/notes/tags.ts";

const repo = new NoteTagRepository();

export const DELETE: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
});

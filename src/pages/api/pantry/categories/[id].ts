import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { PantryCategoryRepository } from "@/lib/modules/pantry/categories";

const repo = new PantryCategoryRepository();

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const ok = await repo.delete(context.params.id!, uid);
  if (!ok) return errorResponse("Not found", 404);
  return jsonResponse({ deleted: true });
};

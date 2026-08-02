import type { APIRoute } from "astro";
import { jsonResponse, requireUserId, withErrorHandling } from "@/lib/api-helpers.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const repo = new CategoryRepository();
  const categories = await repo.findBySections(uid, ["pantry"]);
  return jsonResponse(categories.map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })));
});

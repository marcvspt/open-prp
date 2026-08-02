import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { PantryRepository } from "@/lib/modules/pantry/repository.ts";
import type { PantryFilter, PantryItemInput } from "@/lib/types/pantry.ts";

const repo = new PantryRepository();

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const filter: PantryFilter = {};
  if (params.category_id) filter.category_id = params.category_id;
  if (params.q) filter.q = params.q;
  const items = await repo.findAll(uid, filter);
  return jsonResponse(items);
});

export const POST: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  try {
    const body = await readJsonBody(context);
    if (!body) return errorResponse("Body inválido", 400);
    if (!body.description) return errorResponse("description is required");

    body.category_id = body.category_id || null;

    const item = await repo.create(body as unknown as PantryItemInput, uid);
    return jsonResponse(item, 201);
  } catch {
    console.error("Failed to create pantry item");
    return errorResponse("Error al crear el producto", 500);
  }
});

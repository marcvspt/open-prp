import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";

const repo = new CategoryRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const categories = await repo.findAll(uid);

  return jsonResponse(categories);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name) {
    return errorResponse("name is required");
  }
  if (!body.sections) {
    body.sections = JSON.stringify(["transactions"]);
  }

  const existing = await repo.findByName(body.name, uid);
  if (existing) {
    return errorResponse(`Ya existe una categoría "${body.name}". Edítala para agregar más secciones.`, 409);
  }

  const category = await repo.create(body, uid);
  return jsonResponse(category, 201);
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";
import type { CreateCategoryInput } from "@/lib/types/category.ts";

const repo = new CategoryRepository();

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const categories = await repo.findAll(uid);

  return jsonResponse(categories);
});

export const POST: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);
  if (!body.name) {
    return errorResponse("name is required");
  }
  if (!body.sections) {
    body.sections = JSON.stringify(["transactions"]);
  }

  const existing = await repo.findByName(body.name as string, uid);
  if (existing) {
    return errorResponse(`Ya existe una categoría "${body.name}". Edítala para agregar más secciones.`, 409);
  }

  const category = await repo.create(body as unknown as CreateCategoryInput, uid);
  return jsonResponse(category, 201);
});

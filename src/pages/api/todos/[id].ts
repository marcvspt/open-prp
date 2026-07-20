import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { TodoRepository } from "@/lib/modules/todos/repository";

const repo = new TodoRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const todo = await repo.findById(context.params.id!, uid);
  if (!todo) return errorResponse("Not found", 404);

  return jsonResponse(todo);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const todo = await repo.update(context.params.id!, body, uid);
  if (!todo) return errorResponse("Not found", 404);

  return jsonResponse(todo);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const todo = await repo.update(context.params.id!, body, uid);
  if (!todo) return errorResponse("Not found", 404);

  return jsonResponse(todo);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("Not found", 404);

  return jsonResponse({ deleted: true });
};

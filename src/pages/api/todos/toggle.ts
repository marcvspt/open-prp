import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers";
import { TodoRepository } from "@/lib/modules/todos/repository";

const repo = new TodoRepository();

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.id) return errorResponse("id is required");

  const todo = await repo.toggleComplete(body.id, uid);
  if (!todo) return errorResponse("Not found", 404);

  return jsonResponse(todo);
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { TaskRepository } from "@/lib/modules/tasks/repository.ts";

const repo = new TaskRepository();

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.id) return errorResponse("id is required");

  const todo = await repo.toggleComplete(body.id, uid);
  if (!todo) return errorResponse("Not found", 404);

  return jsonResponse(todo);
};

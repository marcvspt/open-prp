import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { TaskRepository } from "@/lib/modules/tasks/repository.ts";

const repo = new TaskRepository();

export const PUT: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);
  if (!body.id) return errorResponse("id is required");

  const todo = await repo.toggleComplete(body.id as string, uid);
  if (!todo) return errorResponse("Not found", 404);

  return jsonResponse(todo);
});

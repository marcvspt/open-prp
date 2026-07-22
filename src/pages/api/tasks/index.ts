import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers.ts";
import { TaskRepository } from "@/lib/modules/tasks/repository.ts";

const repo = new TaskRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const tasks = await repo.findAll(uid, {
    is_completed: params.is_completed === "true" ? true : params.is_completed === "false" ? false : undefined,
    category: params.category,
    event_id: params.event_id,
    due_date_from: params.due_date_from,
    due_date_to: params.due_date_to,
  });

  return jsonResponse(tasks);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.description) {
    return errorResponse("description is required");
  }

  const todo = await repo.create(body, uid);
  return jsonResponse(todo, 201);
};

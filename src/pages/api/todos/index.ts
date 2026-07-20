import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers";
import { TodoRepository } from "@/lib/modules/todos/repository";

const repo = new TodoRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const todos = await repo.findAll(uid, {
    is_completed: params.is_completed === "true" ? true : params.is_completed === "false" ? false : undefined,
    category: params.category,
    event_id: params.event_id,
    due_date_from: params.due_date_from,
    due_date_to: params.due_date_to,
    family_id: params.family_id,
    scope: params.scope as "personal" | "family" | "all" | undefined,
  });

  return jsonResponse(todos);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.title) {
    return errorResponse("title is required");
  }

  const todo = await repo.create(body, uid);
  return jsonResponse(todo, 201);
};

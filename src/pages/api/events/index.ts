import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams, parsePageParams } from "@/lib/api-helpers.ts";
import { EventRepository } from "@/lib/modules/events/repository.ts";

const repo = new EventRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const { page, pageSize } = parsePageParams(context.url);

  const result = await repo.findAll(uid, {
    status: params.status,
    category_id: params.category_id,
    date_from: params.date_from,
    date_to: params.date_to,
    page,
    pageSize,
  });

  return jsonResponse(result);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.description || !body.start_date) {
    return errorResponse("description and start_date are required");
  }

  const event = await repo.create(body, uid);
  return jsonResponse(event, 201);
};

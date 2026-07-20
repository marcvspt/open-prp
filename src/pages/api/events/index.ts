import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams, parsePageParams } from "@/lib/api-helpers";
import { EventRepository } from "@/lib/modules/events/repository";

const repo = new EventRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const { page, pageSize } = parsePageParams(context.url);

  const result = await repo.findAll(uid, {
    status: params.status,
    date_from: params.date_from,
    date_to: params.date_to,
    scope: params.scope as "personal" | "family" | "all" | undefined,
    family_id: params.family_id,
    page,
    pageSize,
  });

  return jsonResponse(result);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.title || !body.start_date) {
    return errorResponse("title and start_date are required");
  }

  const event = await repo.create(body, uid);
  return jsonResponse(event, 201);
};

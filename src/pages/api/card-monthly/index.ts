import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";

const repo = new CardMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month query param is required (YYYY-MM)");

  const items = await repo.findByMonth(month, uid);
  return jsonResponse(items);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.card_id || !body.month) {
    return errorResponse("card_id and month are required");
  }

  const item = await repo.upsert(body, uid);
  return jsonResponse(item);
};

export const PATCH: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.id) return errorResponse("id is required");

  const item = await repo.togglePaid(body.id, uid, body.is_paid);
  if (!item) return errorResponse("Not found", 404);
  return jsonResponse(item);
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers.ts";
import { CashbackRepository } from "@/lib/modules/cashback/repository.ts";

const repo = new CashbackRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const cashbacks = await repo.findAll(uid, params.card_id);
  return jsonResponse(cashbacks);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.amount || !body.date) {
    return errorResponse("amount and date are required");
  }

  const cashback = await repo.create(body, uid);
  return jsonResponse(cashback, 201);
};

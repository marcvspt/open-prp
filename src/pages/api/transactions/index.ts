import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams, parsePageParams } from "@/lib/api-helpers.ts";
import { TransactionRepository } from "@/lib/modules/transactions/repository.ts";

const repo = new TransactionRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const { page, pageSize } = parsePageParams(context.url);

  const result = await repo.findAll(uid, {
    type: params.type as "income" | "expense" | undefined,
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
  if (!body.type || body.amount == null || !body.date || !body.payment_method_id) {
    return errorResponse("type, amount, date, and payment_method_id are required");
  }

  const transaction = await repo.create(body, uid);
  return jsonResponse(transaction, 201);
};

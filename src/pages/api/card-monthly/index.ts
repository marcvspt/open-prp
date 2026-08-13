import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";
import type { CardMonthlyInput } from "@/lib/types/card-monthly.ts";

const repo = new CardMonthlyRepository();

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month query param is required (YYYY-MM)");

  const items = await repo.findByMonth(month, uid);
  return jsonResponse(items);
});

export const PUT: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);
  if (!body.card_id || !body.month) {
    return errorResponse("card_id and month are required");
  }

  const item = await repo.upsert(body as unknown as CardMonthlyInput, uid);
  return jsonResponse(item);
});

export const PATCH: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);
  if (!body.id) return errorResponse("id is required");

  const paidAmount = body.paid_amount !== undefined ? Number(body.paid_amount) : undefined;
  const item = await repo.togglePaid(body.id as string, uid, body.is_paid as boolean, body.paid_at as string | undefined, paidAmount);
  if (!item) return errorResponse("Not found", 404);
  return jsonResponse(item);
});

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { RecurringPaymentMonthlyRepository } from "@/lib/modules/recurring-payment-monthly/repository.ts";
import type { RecurringPaymentMonthlyUpdate } from "@/lib/types/recurring-payment.ts";

const repo = new RecurringPaymentMonthlyRepository();

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month es requerido");

  const rows = await repo.findByMonth(month, uid);
  return jsonResponse(rows);
});

export const PATCH: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const id = context.url.searchParams.get("id");
  if (!id) return errorResponse("id es requerido");

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);

  const ok = await repo.update(id, body as RecurringPaymentMonthlyUpdate, uid);
  if (!ok) return errorResponse("No encontrado", 404);
  return jsonResponse({ updated: true });
});

export const DELETE: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const id = context.url.searchParams.get("id");
  if (!id) return errorResponse("id es requerido");

  const ok = await repo.delete(id, uid);
  if (!ok) return errorResponse("No encontrado", 404);
  return jsonResponse({ deleted: true });
});

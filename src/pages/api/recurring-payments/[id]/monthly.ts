import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const { id } = context.params;
  if (!id) return errorResponse("ID requerido");

  const body = await context.request.json();
  if (!body.month || body.amount === undefined) {
    return errorResponse("month y amount son requeridos");
  }

  const repo = new RecurringPaymentRepository();
  const existing = await repo.findById(id, uid);
  if (!existing) return errorResponse("No encontrado", 404);

  const result = await repo.upsertMonthly(id, body.month, { amount: body.amount }, uid);
  return jsonResponse(result);
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/api-helpers.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const POST: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const { id } = context.params;
  if (!id) return errorResponse("ID requerido");

  const body = await readJsonBody(context);
  if (!body) return errorResponse("Body inválido", 400);
  if (!body.month || body.amount === undefined) {
    return errorResponse("month y amount son requeridos");
  }

  const repo = new RecurringPaymentRepository();
  const existing = await repo.findById(id, uid);
  if (!existing) return errorResponse("No encontrado", 404);

  const result = await repo.upsertMonthly(
    id,
    body.month as string,
    {
      amount: body.amount as number,
      category_id: body.category_id as string | undefined,
      payment_method_id: body.payment_method_id as string | undefined,
      is_active: body.is_active as boolean | undefined,
      is_paid: body.is_paid as boolean | undefined,
    },
    uid,
  );
  return jsonResponse(result);
});

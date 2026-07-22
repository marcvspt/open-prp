import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { RecurringPaymentMonthlyRepository } from "@/lib/modules/recurring-payment-monthly/repository.ts";

const repo = new RecurringPaymentMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month es requerido");

  const rows = await repo.getHistory(month, uid);
  return jsonResponse(rows);
};

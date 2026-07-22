import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

const repo = new RecurringPaymentRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const payment = await repo.findById(context.params.id!, uid);
  if (!payment) return errorResponse("No encontrado", 404);

  return jsonResponse(payment);
};

export const PUT: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  const payment = await repo.update(context.params.id!, body, uid);
  if (!payment) return errorResponse("No encontrado", 404);

  return jsonResponse(payment);
};

export const DELETE: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const deleted = await repo.delete(context.params.id!, uid);
  if (!deleted) return errorResponse("No encontrado", 404);

  return jsonResponse({ deleted: true });
};

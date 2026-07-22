import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

const repo = new RecurringPaymentRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const payments = await repo.findAll(uid);
  return jsonResponse(payments);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name || !body.default_amount) {
    return errorResponse("name y default_amount son requeridos");
  }

  const payment = await repo.create(body, uid);
  return jsonResponse(payment, 201);
};

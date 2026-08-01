import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers.ts";
import { InstallmentRepository } from "@/lib/modules/installments/repository.ts";
import { lastYearWindow, lastDayOfMonth } from "@/lib/date.ts";

const repo = new InstallmentRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  let date_from = params.date_from;
  let date_to = params.date_to;
  if (!params.month && !date_from && !date_to) {
    const { from, to } = lastYearWindow(context.locals.createdAt);
    date_from = `${from}-01`;
    date_to = lastDayOfMonth(to);
  }

  const installments = await repo.findAll(uid, {
    active_only: params.active_only === "true",
    category_id: params.category_id,
    payment_method_id: params.payment_method_id,
    q: params.q,
    month: params.month,
    date_from,
    date_to,
  });

  return jsonResponse(installments);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.description || !body.total_amount || !body.monthly_amount || !body.total_months || !body.start_date || !body.payment_method_id) {
    return errorResponse("description, total_amount, monthly_amount, total_months, start_date, and payment_method_id are required");
  }

  const installment = await repo.create(body, uid);
  return jsonResponse(installment, 201);
};

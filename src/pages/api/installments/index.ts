import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers";
import { InstallmentRepository } from "@/lib/modules/installments/repository";

const repo = new InstallmentRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const installments = await repo.findAll(uid, {
    card_id: params.card_id,
    active_only: params.active_only === "true",
    family_id: params.family_id,
    scope: params.scope as "personal" | "family" | "all" | undefined,
  });

  return jsonResponse(installments);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.description || !body.total_amount || !body.monthly_amount || !body.total_months || !body.start_month) {
    return errorResponse("description, total_amount, monthly_amount, total_months, and start_month are required");
  }

  const installment = await repo.create(body, uid);
  return jsonResponse(installment, 201);
};

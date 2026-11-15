import type { APIRoute } from "astro";
import { errorResponse, jsonResponse, readJsonBody, requireUserId, withErrorHandling } from "@/lib/server/api-helpers.ts";
import { isAmount, isCurrency, isDateOnly, isId } from "@/lib/server/financial-input.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";

const repo = new CardMonthlyRepository();

export const POST: APIRoute = withErrorHandling(async context => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;
  const body = await readJsonBody(context);
  if (!body) return errorResponse("invalid-body");

  const { id, statement_balance, currency, paid_amount, paid_at } = body;
  if (!isId(id) || !isAmount(statement_balance) || statement_balance <= 0 || !isCurrency(currency)) return errorResponse("invalid-body");
  if (paid_amount !== undefined && (!isAmount(paid_amount) || paid_amount <= 0)) return errorResponse("invalid-payment-amount");
  if (paid_at !== undefined && !isDateOnly(paid_at)) return errorResponse("invalid-body");

  const result = await repo.pay({ id, statement_balance, currency, paid_amount, paid_at }, uid);
  if (result.error) {
    return errorResponse(result.error, result.error === "not-found" ? 404 : result.error === "invalid-payment-amount" ? 400 : 409);
  }
  return jsonResponse(result.statement);
});

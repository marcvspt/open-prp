import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, readJsonBody, withErrorHandling } from "@/lib/server/api-helpers.ts";
import { isAvailableMonth } from "@/lib/date.ts";
import { calculateCardDebt } from "@/lib/modules/card-monthly/calculator.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";

const monthlyRepo = new CardMonthlyRepository();

export const POST: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await readJsonBody(context);
  if (!body) return errorResponse("invalid-body");
  const { cardId, month } = body;
  if (typeof cardId !== "string" || !cardId || typeof month !== "string" || !month) return errorResponse("card-month-required");
  if (!isAvailableMonth(month, context.locals.createdAt)) return errorResponse("month-unavailable");

  try {
    const calculated = await calculateCardDebt(cardId, month, uid);
    if (!calculated) return errorResponse("not-found", 404);
    const saved = await monthlyRepo.upsert({
      card_id: cardId, month, statement_balance: calculated.statement_balance, currency: calculated.currency,
    }, uid);
    if (!saved) return errorResponse("card-statement-changed", 409);
    return jsonResponse(calculated);
  } catch {
    console.error("Card debt calculation failed");
    return errorResponse("card-calculation-failed", 500);
  }
});

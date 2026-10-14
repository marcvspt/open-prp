import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/server/api-helpers.ts";
import { calculateCardDebt } from "@/lib/modules/card-monthly/calculator.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";

const monthlyRepo = new CardMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const cardId = context.url.searchParams.get("cardId");
  const month = context.url.searchParams.get("month");
  if (!cardId || !month) return errorResponse("card-month-required");

  try {
    const calculated = await calculateCardDebt(cardId, month, uid);
    await monthlyRepo.upsert({ card_id: cardId, month, statement_balance: calculated.statement_balance }, uid);
    return jsonResponse(calculated);
  } catch {
    console.error("Card debt calculation failed");
    return errorResponse("card-calculation-failed", 500);
  }
};

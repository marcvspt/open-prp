import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { calculateCardDebt } from "@/lib/modules/card-monthly/calculator.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";

const monthlyRepo = new CardMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const cardId = context.url.searchParams.get("cardId");
  const month = context.url.searchParams.get("month");
  if (!cardId || !month) return errorResponse("cardId and month are required");

  try {
    const calculated = await calculateCardDebt(cardId, month, uid);
    await monthlyRepo.upsert({ card_id: cardId, month, statement_balance: calculated.statement_balance }, uid);
    return jsonResponse(calculated);
  } catch (err: unknown) {
    return errorResponse(err instanceof Error ? err.message : "Error calculating debt", 500);
  }
};

import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId } from "@/lib/api-helpers.ts";
import { CreditCardRepository } from "@/lib/modules/credit-cards/repository.ts";

const repo = new CreditCardRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const cards = await repo.findAll(uid);
  return jsonResponse(cards);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name || !body.type) {
    return errorResponse("name and type are required");
  }
  if (!["credit", "debit", "voucher"].includes(body.type)) {
    return errorResponse("type must be 'credit', 'debit', or 'voucher'");
  }

  const card = await repo.create(body, uid);
  return jsonResponse(card, 201);
};

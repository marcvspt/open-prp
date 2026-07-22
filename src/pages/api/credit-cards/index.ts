import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, getSearchParams } from "@/lib/api-helpers.ts";
import { CreditCardRepository } from "@/lib/modules/credit-cards/repository.ts";

const repo = new CreditCardRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const params = getSearchParams(context);
  const cards = await repo.findAll(uid);

  if (params.month) {
    const summaries = await Promise.all(
      cards.map(async (card) => {
        const summary = await repo.getMonthlySummary(card.id, params.month!);
        return { ...card, ...summary };
      })
    );
    return jsonResponse(summaries);
  }

  return jsonResponse(cards);
};

export const POST: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const body = await context.request.json();
  if (!body.name || !body.type || !body.max_limit || !body.closing_day || !body.due_day) {
    return errorResponse("name, type, max_limit, closing_day, and due_day are required");
  }
  if (!["credit", "debit"].includes(body.type)) {
    return errorResponse("type must be 'credit' or 'debit'");
  }

  const card = await repo.create(body, uid);
  return jsonResponse(card, 201);
};

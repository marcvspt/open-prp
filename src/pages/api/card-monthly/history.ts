import type { APIRoute } from "astro";
import { jsonResponse, requireUserId } from "@/lib/api-helpers.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";

const repo = new CardMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (month) {
    const items = await repo.findByMonth(month, uid);
    return jsonResponse(items);
  }

  const items = await repo.getHistory(uid);
  return jsonResponse(items);
};

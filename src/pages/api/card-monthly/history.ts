import type { APIRoute } from "astro";
import { jsonResponse, requireUserId } from "@/lib/api-helpers.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";
import { lastYearWindow } from "@/lib/date.ts";

const repo = new CardMonthlyRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (month) {
    const items = await repo.findByMonth(month, uid);
    return jsonResponse(items);
  }

  const { from, to } = lastYearWindow(context.locals.createdAt);
  const items = await repo.getHistory(uid);
  return jsonResponse(items.filter(d => d.month >= from && d.month <= to));
};

import type { APIRoute } from "astro";
import { jsonResponse, requireUserId } from "@/lib/api-helpers.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";
import { lastYearWindow } from "@/lib/date.ts";

const repo = new RecurringPaymentRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const { from, to } = lastYearWindow(context.locals.createdAt);
  const history = await repo.getHistory(uid, from, to);

  const month = context.url.searchParams.get("month");
  if (month) {
    return jsonResponse(history.filter(d => d.month === month));
  }
  return jsonResponse(history);
};

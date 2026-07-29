import type { APIRoute } from "astro";
import { jsonResponse, requireUserId } from "@/lib/api-helpers.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";
import { currentMonthStr } from "@/lib/date.ts";

const repo = new RecurringPaymentRepository();

export const GET: APIRoute = async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const today = currentMonthStr();
  const [curY, curM] = today.split("-").map(Number);
  const nextMY = curM === 12 ? curY + 1 : curY;
  const nextMM = curM === 12 ? 1 : curM + 1;
  const nextMonth = `${nextMY}-${String(nextMM).padStart(2, "0")}`;
  const startMonth = context.locals.createdAt
    ? (() => { const d = new Date(context.locals.createdAt!); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })()
    : today;
  const twelveMonthsAgo = (() => {
    const total = curY * 12 + curM - 13;
    const y = Math.floor(total / 12);
    const m = total % 12 + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  })();
  const fromMonth = startMonth > twelveMonthsAgo ? startMonth : twelveMonthsAgo;

  const history = await repo.getHistory(uid, fromMonth, nextMonth);

  const month = context.url.searchParams.get("month");
  if (month) {
    return jsonResponse(history.filter(d => d.month === month));
  }
  return jsonResponse(history);
};

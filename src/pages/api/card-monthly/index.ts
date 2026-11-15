import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, withErrorHandling } from "@/lib/server/api-helpers.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";

const repo = new CardMonthlyRepository();

export const GET: APIRoute = withErrorHandling(async (context) => {
  const uid = requireUserId(context);
  if (uid instanceof Response) return uid;

  const month = context.url.searchParams.get("month");
  if (!month) return errorResponse("month-required");

  const items = await repo.findByMonth(month, uid);
  return jsonResponse(items);
});

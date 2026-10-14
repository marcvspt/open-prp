import type { APIRoute } from "astro";
import { jsonResponse, errorResponse, requireUserId, withErrorHandling } from "@/lib/server/api-helpers.ts";
import { InstallmentRepository } from "@/lib/modules/installments/repository.ts";
import { currentMonthStr, isAvailableMonth } from "@/lib/date.ts";

export const GET: APIRoute = withErrorHandling(async context => {
  const userId = requireUserId(context);
  if (userId instanceof Response) return userId;
  const month = context.url.searchParams.get("month") || currentMonthStr();
  if (!isAvailableMonth(month, context.locals.createdAt)) {
    return errorResponse("month-unavailable", 400);
  }
  return jsonResponse(await new InstallmentRepository().findSummaryByMonth(userId, month));
});

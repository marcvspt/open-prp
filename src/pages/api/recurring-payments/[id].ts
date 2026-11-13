import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { isValidRecurringPaymentDay, RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const { GET, PUT, DELETE } = createIdRoutes(new RecurringPaymentRepository(), {
  patch: false,
  notFoundCode: "not-found",
  validateUpdate: (body) => isValidRecurringPaymentDay(body.scheduled_day) ? null : "invalid-recurring-payment-day",
});

import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { isValidRecurringPaymentDay, RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const { GET, POST } = createIndexRoutes(new RecurringPaymentRepository(), {
  validateCreate: (body) => {
    if (!body.name || !body.default_amount || !body.payment_method_id) return "recurring-payment-fields-required";
    return isValidRecurringPaymentDay(body.scheduled_day) ? null : "invalid-recurring-payment-day";
  },
});

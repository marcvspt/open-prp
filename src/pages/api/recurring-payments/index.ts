import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const { GET, POST } = createIndexRoutes(new RecurringPaymentRepository(), {
  validateCreate: (body) =>
    !body.name || !body.default_amount || !body.payment_method_id
      ? "recurring-payment-fields-required"
      : null,
});

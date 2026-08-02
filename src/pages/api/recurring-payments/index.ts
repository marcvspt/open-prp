import { createIndexRoutes } from "@/lib/api-routes.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const { GET, POST } = createIndexRoutes(new RecurringPaymentRepository(), {
  validateCreate: (body) =>
    !body.name || !body.default_amount || !body.payment_method_id
      ? "name, default_amount, y payment_method_id son requeridos"
      : null,
});

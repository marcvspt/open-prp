import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const { GET, PUT, DELETE } = createIdRoutes(new RecurringPaymentRepository(), {
  patch: false,
  notFoundCode: "not-found",
});

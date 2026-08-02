import { createIdRoutes } from "@/lib/api-routes.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";

export const { GET, PUT, DELETE } = createIdRoutes(new RecurringPaymentRepository(), {
  patch: false,
  notFoundMessage: "No encontrado",
});

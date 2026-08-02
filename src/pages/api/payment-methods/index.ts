import { createIndexRoutes } from "@/lib/api-routes.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";

export const { GET, POST } = createIndexRoutes(new PaymentMethodRepository(), {
  validateCreate: (body) => (!body.name ? "name is required" : null),
});

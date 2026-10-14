import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";

export const { GET, POST } = createIndexRoutes(new PaymentMethodRepository(), {
  validateCreate: (body) => (!body.name ? "name-required" : null),
});

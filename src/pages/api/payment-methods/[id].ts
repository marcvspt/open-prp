import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";

export const { PATCH, PUT, DELETE } = createIdRoutes(new PaymentMethodRepository(), { get: false });

import { createIdRoutes } from "@/lib/api-routes.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";

export const { PATCH, PUT, DELETE } = createIdRoutes(new PaymentMethodRepository(), { get: false });

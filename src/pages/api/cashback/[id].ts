import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { CashbackRepository } from "@/lib/modules/cashback/repository.ts";
import { validateCashbackWrite } from "@/lib/server/movement-validation.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new CashbackRepository(), {
  validateUpdate: (body, userId) => validateCashbackWrite(body, userId, false),
});

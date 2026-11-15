import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { TransactionRepository } from "@/lib/modules/transactions/repository.ts";
import { validateTransactionWrite } from "@/lib/server/movement-validation.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new TransactionRepository(), {
  validateUpdate: (body, userId) => validateTransactionWrite(body, userId, false),
});

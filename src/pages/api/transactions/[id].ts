import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { TransactionRepository } from "@/lib/modules/transactions/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new TransactionRepository());

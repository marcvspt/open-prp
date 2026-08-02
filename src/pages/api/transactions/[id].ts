import { createIdRoutes } from "@/lib/api-routes.ts";
import { TransactionRepository } from "@/lib/modules/transactions/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new TransactionRepository());

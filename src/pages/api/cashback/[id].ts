import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { CashbackRepository } from "@/lib/modules/cashback/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new CashbackRepository());

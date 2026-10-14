import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new CategoryRepository());

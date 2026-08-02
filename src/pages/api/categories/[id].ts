import { createIdRoutes } from "@/lib/api-routes.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";

export const { PATCH, PUT, DELETE } = createIdRoutes(new CategoryRepository(), { get: false });

import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new ShoppingRepository());

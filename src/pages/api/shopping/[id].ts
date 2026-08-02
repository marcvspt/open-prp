import { createIdRoutes } from "@/lib/api-routes.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new ShoppingRepository());

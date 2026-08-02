import { createIdRoutes } from "@/lib/api-routes.ts";
import { ShoppingListRepository } from "@/lib/modules/shopping/lists.ts";

export const { GET, PATCH, DELETE } = createIdRoutes(new ShoppingListRepository(), { put: false });

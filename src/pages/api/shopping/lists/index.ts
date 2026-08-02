import { createIndexRoutes } from "@/lib/api-routes.ts";
import { ShoppingListRepository } from "@/lib/modules/shopping/lists.ts";

export const { GET, POST } = createIndexRoutes(new ShoppingListRepository(), {
  validateCreate: (body) => (typeof body.name === "string" ? null : "name is required"),
});

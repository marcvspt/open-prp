import { createIndexRoutes } from "@/lib/api-routes.ts";
import { parseBoolParam } from "@/lib/api-helpers.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";

export const { GET, POST } = createIndexRoutes(new ShoppingRepository(), {
  buildFilter: (params) => ({
    is_checked: parseBoolParam(params.is_checked),
    is_completed: parseBoolParam(params.is_completed),
    list_id: params.list_id,
    category: params.category,
    event_id: params.event_id,
  }),
  validateCreate: (body) => (!body.name ? "name is required" : null),
});

import { createIndexRoutes } from "@/lib/api-routes.ts";
import { parseBoolParam } from "@/lib/api-helpers.ts";
import { TaskRepository } from "@/lib/modules/tasks/repository.ts";

export const { GET, POST } = createIndexRoutes(new TaskRepository(), {
  buildFilter: (params) => ({
    is_completed: parseBoolParam(params.is_completed),
    category: params.category,
    due_date_from: params.due_date_from,
    due_date_to: params.due_date_to,
  }),
  validateCreate: (body) => (!body.description ? "description is required" : null),
});

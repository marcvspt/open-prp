import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { TaskRepository } from "@/lib/modules/tasks/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new TaskRepository());

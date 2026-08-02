import { createIdRoutes } from "@/lib/api-routes.ts";
import { EventRepository } from "@/lib/modules/events/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new EventRepository());

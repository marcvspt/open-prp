import { createIdRoutes } from "@/lib/api-routes.ts";
import { PantryRepository } from "@/lib/modules/pantry/repository.ts";

export const { GET, PUT, DELETE } = createIdRoutes(new PantryRepository(), { patch: false });

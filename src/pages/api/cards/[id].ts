import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new CardRepository());

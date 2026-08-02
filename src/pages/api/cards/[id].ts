import { createIdRoutes } from "@/lib/api-routes.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new CardRepository());

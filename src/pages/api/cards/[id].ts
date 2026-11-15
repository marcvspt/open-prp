import { createIdRoutes } from "@/lib/server/api-routes.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";
import { validateCard } from "@/lib/server/financial-input.ts";

export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new CardRepository(), {
  validateUpdate: body => validateCard(body, false),
});

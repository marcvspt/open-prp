import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";
import { validateCard } from "@/lib/server/financial-input.ts";

export const { GET, POST } = createIndexRoutes(new CardRepository(), {
  validateCreate: body => validateCard(body, true),
});

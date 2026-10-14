import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";

export const { GET, POST } = createIndexRoutes(new CardRepository(), {
  validateCreate: (body) => {
    if (!body.name || !body.type) return "card-fields-required";
    if (!["credit", "debit", "voucher"].includes(body.type as string)) return "invalid-card-type";
    return null;
  },
});

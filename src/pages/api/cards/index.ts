import { createIndexRoutes } from "@/lib/api-routes.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";

export const { GET, POST } = createIndexRoutes(new CardRepository(), {
  validateCreate: (body) => {
    if (!body.name || !body.type) return "name and type are required";
    if (!["credit", "debit", "voucher"].includes(body.type as string)) return "type must be 'credit', 'debit', or 'voucher'";
    return null;
  },
});

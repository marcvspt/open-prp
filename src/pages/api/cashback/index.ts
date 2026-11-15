import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { getDateRange } from "@/lib/server/api-helpers.ts";
import { CashbackRepository } from "@/lib/modules/cashback/repository.ts";
import { validateCashbackWrite } from "@/lib/server/movement-validation.ts";

export const { GET, POST } = createIndexRoutes(new CashbackRepository(), {
  buildFilter: (params, context) => ({
    card_id: params.card_id,
    q: params.q,
    month: params.month,
    ...getDateRange(params, context.locals.createdAt),
  }),
  validateCreate: (body, userId) => validateCashbackWrite(body, userId, true),
});

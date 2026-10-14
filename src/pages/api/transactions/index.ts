import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { getDateRange, parsePageParams } from "@/lib/server/api-helpers.ts";
import { TransactionRepository } from "@/lib/modules/transactions/repository.ts";

export const { GET, POST } = createIndexRoutes(new TransactionRepository(), {
  buildFilter: (params, context) => ({
    ...parsePageParams(context.url),
    type: params.type as "income" | "expense" | undefined,
    category_id: params.category_id,
    payment_method_id: params.payment_method_id,
    q: params.q,
    month: params.month,
    ...getDateRange(params, context.locals.createdAt),
  }),
  validateCreate: (body) =>
    !body.type || body.amount == null || !body.date || !body.payment_method_id
      ? "transaction-fields-required"
      : null,
});

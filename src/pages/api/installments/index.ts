import { createIndexRoutes } from "@/lib/api-routes.ts";
import { getDateRange, parseBoolParam } from "@/lib/api-helpers.ts";
import { InstallmentRepository } from "@/lib/modules/installments/repository.ts";

export const { GET, POST } = createIndexRoutes(new InstallmentRepository(), {
  buildFilter: (params, context) => ({
    active_only: parseBoolParam(params.active_only),
    category_id: params.category_id,
    payment_method_id: params.payment_method_id,
    q: params.q,
    month: params.month,
    ...getDateRange(params, context.locals.createdAt),
  }),
  validateCreate: (body) =>
    !body.description || !body.total_amount || !body.monthly_amount || !body.total_months || !body.start_date || !body.payment_method_id
      ? "description, total_amount, monthly_amount, total_months, start_date, and payment_method_id are required"
      : null,
});

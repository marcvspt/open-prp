import { createIndexRoutes } from "@/lib/server/api-routes.ts";
import { getDateRange, parsePageParams } from "@/lib/server/api-helpers.ts";
import { InstallmentRepository } from "@/lib/modules/installments/repository.ts";
import type { InstallmentInput, InstallmentListFilter } from "@/lib/types/installment.ts";

const repository = new InstallmentRepository();

export const { GET, POST } = createIndexRoutes({
  findAll: (userId: string, filter?: InstallmentListFilter) => repository.findPaginated(userId, filter),
  create: (data: InstallmentInput, userId: string) => repository.create(data, userId),
}, {
  buildFilter: (params, context): InstallmentListFilter => ({
    ...parsePageParams(context.url),
    active_only: params.active_only !== "false" && params.active_only !== "inactive",
    inactive_only: params.active_only === "inactive",
    category_id: params.category_id,
    payment_method_id: params.payment_method_id,
    q: params.q,
    month: params.month,
    ...getDateRange(params, context.locals.createdAt),
  }),
  validateCreate: (body) =>
    !body.description || !body.total_amount || !body.monthly_amount || !body.total_months || !body.start_date || !body.payment_method_id
      ? "installment-fields-required"
      : null,
});

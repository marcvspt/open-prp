import { apiFetch } from "@/lib/api-client.ts";
import type { PayCardDebtPartialArgs } from "@/lib/types/dashboard.ts";
import { CARRYOVER_DESCRIPTION_PREFIX } from "@/lib/modules/card-monthly/carryover.ts";

export class CarryoverError extends Error {
  constructor(cause: unknown) {
    super("Carryover failed", { cause });
    this.name = "CarryoverError";
  }
}

export async function payCardDebtFull(id: string, paidAt?: string, paidAmount?: number): Promise<void> {
  await apiFetch("/api/card-monthly", {
    method: "PATCH",
    body: JSON.stringify({ id, is_paid: true, paid_at: paidAt, ...(paidAmount !== undefined && { paid_amount: paidAmount }) }),
  });
}

export async function payCardDebtPartial(args: PayCardDebtPartialArgs): Promise<void> {
  const remaining = args.statementBalance - args.paidAmount;
  if (remaining <= 0) return payCardDebtFull(args.id, args.paidAt, args.statementBalance);

  await payCardDebtFull(args.id, args.paidAt, args.paidAmount);

  const [year, monthNum] = args.month.split("-").map(Number);
  const nextYear = monthNum === 12 ? year + 1 : year;
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const day = args.cutoffDay ?? 1;
  const date = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  try {
    await apiFetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        type: "expense",
        amount: remaining,
        payment_method_id: args.paymentMethodId,
        category_id: args.categoryId,
        description: `${CARRYOVER_DESCRIPTION_PREFIX}${args.month}`,
        date,
      }),
    });
  } catch (error: unknown) {
    throw new CarryoverError(error);
  }
}

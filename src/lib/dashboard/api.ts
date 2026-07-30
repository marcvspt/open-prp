import { safeFetch } from "@/lib/safeFetch.ts";
import type { PayCardDebtPartialArgs } from "@/lib/types/dashboard.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function payCardDebtFull(id: string, paidAt?: string): Promise<boolean> {
  return safeFetch("/api/card-monthly", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, is_paid: true, paid_at: paidAt }),
  });
}

export async function payCardDebtPartial(args: PayCardDebtPartialArgs): Promise<boolean> {
  const remaining = args.statementBalance - args.paidAmount;
  if (remaining <= 0) return payCardDebtFull(args.id, args.paidAt);

  const paid = await payCardDebtFull(args.id, args.paidAt);
  if (!paid) return false;

  const [year, monthNum] = args.month.split("-").map(Number);
  const nextYear = monthNum === 12 ? year + 1 : year;
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const day = args.cutoffDay ?? 1;
  const date = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return safeFetch("/api/transactions", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      type: "expense",
      amount: remaining,
      payment_method_id: args.paymentMethodId,
      category_id: args.categoryId,
      description: `Saldo pendiente ${args.month}`,
      date,
    }),
  });
}

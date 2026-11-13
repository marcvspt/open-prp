import type { StatementAmounts } from "@/lib/types/card-monthly.ts";

export function calculateStatementBalance(amounts: StatementAmounts): number {
  return amounts.total_purchases + amounts.total_installments + amounts.total_recurring - amounts.total_cashback;
}

import { getDb } from "@/lib/db/client.ts";
import { cardStatementPeriod, installmentFirstMonth, installmentRemaining, isInstallmentInMonth } from "@/lib/date.ts";
import type { CalculatedDebt } from "@/lib/types/card-monthly.ts";

export async function calculateCardDebt(cardId: string, month: string, userId: string): Promise<CalculatedDebt> {
  const db = getDb();

  const cardRes = await db.execute({
    sql: "SELECT CASE WHEN type = 'credit' THEN cutoff_day ELSE NULL END AS cutoff_day FROM cards WHERE id = ? AND user_id = ?",
    args: [cardId, userId],
  });
  const card = cardRes.rows[0] as unknown as { cutoff_day: number | null } | undefined;
  if (!card) throw new Error("Card not found");

  const period = cardStatementPeriod(month, card.cutoff_day);

  const [txResult, instRes, cbRes, rpRes] = await Promise.all([
    db.execute({
      sql: `SELECT COALESCE(SUM(t.amount), 0) AS total FROM transactions t
            LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id AND pm.user_id = t.user_id
            WHERE pm.card_id = ? AND t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date <= ?`,
      args: [cardId, userId, period.start, period.end],
    }),
    db.execute({
      sql: `SELECT i.monthly_amount, i.start_date, i.total_months FROM installments i
            LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id AND pm.user_id = i.user_id
            WHERE pm.card_id = ? AND i.user_id = ?`,
      args: [cardId, userId],
    }),
    db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) AS total FROM cashback
            WHERE card_id = ? AND user_id = ? AND date >= ? AND date <= ?`,
      args: [cardId, userId, period.start, period.end],
    }),
    db.execute({
      sql: `SELECT COALESCE(SUM(rpm.amount), 0) AS total FROM recurring_payment_monthly rpm
            JOIN payment_methods pm ON pm.id = rpm.payment_method_id AND pm.user_id = rpm.user_id
            WHERE pm.card_id = ? AND rpm.user_id = ? AND rpm.month = ? AND rpm.is_paid = 1 AND rpm.type = 'expense'`,
      args: [cardId, userId, month],
    }),
  ]);
  const totalPurchases = Number((txResult.rows[0] as unknown as { total: number }).total);
  let totalInstallments = 0;
  let committedInstallments = 0;
  for (const row of instRes.rows as unknown as { monthly_amount: number; start_date: string; total_months: number }[]) {
    const { start_date, total_months, monthly_amount } = row;
    const firstMonth = installmentFirstMonth(start_date, card.cutoff_day);
    if (isInstallmentInMonth(month, start_date, total_months, card.cutoff_day)) {
      totalInstallments += Number(monthly_amount);
    }
    committedInstallments += Number(monthly_amount) * installmentRemaining(month, firstMonth, total_months);
  }

  const totalCashback = Number((cbRes.rows[0] as unknown as { total: number }).total);
  const totalRecurring = Number((rpRes.rows[0] as unknown as { total: number }).total);

  const statementBalance = totalPurchases + totalInstallments + totalRecurring - totalCashback;

  return {
    total_purchases: totalPurchases,
    total_installments: totalInstallments,
    total_recurring: totalRecurring,
    total_cashback: totalCashback,
    statement_balance: statementBalance,
    committed_installments: committedInstallments,
    total_committed: statementBalance + committedInstallments,
  };
}

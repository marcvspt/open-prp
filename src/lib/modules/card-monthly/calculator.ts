import { getDb } from "@/lib/server/db/client.ts";
import { cardStatementPeriod, installmentFirstMonth, installmentRemaining, isInstallmentInMonth } from "@/lib/date.ts";
import { calculateStatementBalance } from "@/lib/modules/card-monthly/statement-balance.ts";
import type { CalculatedDebt } from "@/lib/types/card-monthly.ts";

export async function calculateCardDebt(cardId: string, month: string, userId: string): Promise<CalculatedDebt | null> {
  const db = getDb();

  const cardRes = await db.execute({
    sql: "SELECT cutoff_day FROM cards WHERE id = ? AND user_id = ? AND type = 'credit'",
    args: [cardId, userId],
  });
  const card = cardRes.rows[0] as unknown as { cutoff_day: number | null } | undefined;
  if (!card) return null;

  const period = cardStatementPeriod(month, card.cutoff_day);

  const [txResult, instRes, cbRes, rpRes] = await Promise.all([
    db.execute({
      sql: `SELECT t.currency, SUM(t.amount) AS total FROM transactions t
            LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id AND pm.user_id = t.user_id
            WHERE pm.card_id = ? AND t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
            GROUP BY t.currency`,
      args: [cardId, userId, period.start, period.end],
    }),
    db.execute({
      sql: `SELECT i.monthly_amount, i.start_date, i.total_months, i.currency FROM installments i
            LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id AND pm.user_id = i.user_id
            WHERE pm.card_id = ? AND i.user_id = ?`,
      args: [cardId, userId],
    }),
    db.execute({
      sql: `SELECT currency, SUM(amount) AS total FROM cashback
            WHERE card_id = ? AND user_id = ? AND date >= ? AND date <= ? GROUP BY currency`,
      args: [cardId, userId, period.start, period.end],
    }),
    db.execute({
      sql: `SELECT rp.currency, SUM(rpm.amount) AS total FROM recurring_payment_monthly rpm
            JOIN recurring_payments rp ON rp.id = rpm.payment_id AND rp.user_id = rpm.user_id
            JOIN payment_methods pm ON pm.id = rpm.payment_method_id AND pm.user_id = rpm.user_id
            WHERE pm.card_id = ? AND rpm.user_id = ? AND rpm.month = ? AND rpm.is_paid = 1 AND rpm.type = 'expense'
            GROUP BY rp.currency`,
      args: [cardId, userId, month],
    }),
  ]);

  const currencies = new Set([...txResult.rows, ...cbRes.rows, ...rpRes.rows].map(row => String(row.currency)));
  const futureCurrencies = new Set<string>();
  let totalInstallments = 0;
  let committedInstallments = 0;
  for (const row of instRes.rows as unknown as { monthly_amount: number; start_date: string; total_months: number; currency: string }[]) {
    const { start_date, total_months, monthly_amount, currency } = row;
    const firstMonth = installmentFirstMonth(start_date, card.cutoff_day);
    if (isInstallmentInMonth(month, start_date, total_months, card.cutoff_day)) {
      currencies.add(currency);
      totalInstallments += Number(monthly_amount);
    }
    const remaining = installmentRemaining(month, firstMonth, total_months);
    if (remaining > 0) {
      futureCurrencies.add(currency);
      committedInstallments += Number(monthly_amount) * remaining;
    }
  }

  const mixed = currencies.size > 1;
  const canCombineCommitments = new Set([...currencies, ...futureCurrencies]).size <= 1;
  const amounts = {
    total_purchases: mixed ? 0 : Number(txResult.rows[0]?.total ?? 0),
    total_installments: mixed ? 0 : totalInstallments,
    total_recurring: mixed ? 0 : Number(rpRes.rows[0]?.total ?? 0),
    total_cashback: mixed ? 0 : Number(cbRes.rows[0]?.total ?? 0),
  };
  const statementBalance = Math.round(calculateStatementBalance(amounts) * 100) / 100;
  return {
    ...amounts,
    statement_balance: statementBalance,
    currency: currencies.size === 1 ? ([...currencies][0] ?? null) : null,
    mixed_currency: mixed,
    committed_installments: canCombineCommitments ? committedInstallments : null,
    total_committed: canCombineCommitments ? statementBalance + committedInstallments : null,
  };
}

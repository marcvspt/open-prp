import { getDb } from "@/lib/db/client.ts";
import type { CalculatedDebt } from "@/lib/types/card-monthly.ts";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getPeriod(closingDay: number, year: number, month: number): { start: string; end: string } {
  const endDay = Math.min(closingDay, daysInMonth(year, month));
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const startDay = Math.min(closingDay + 1, daysInMonth(prevYear, prevMonth));
  return {
    start: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
  };
}

function isMonthInRange(month: string, startMonth: string, totalMonths: number): boolean {
  if (month < startMonth) return false;
  const [sy, sm] = startMonth.split("-").map(Number);
  let em = sm + totalMonths;
  let ey = sy;
  while (em > 12) { em -= 12; ey += 1; }
  const endMonth = `${ey}-${String(em).padStart(2, "0")}`;
  return month < endMonth;
}

export async function calculateCardDebt(cardId: string, month: string, userId: string): Promise<CalculatedDebt> {
  const db = getDb();

  const cardRes = await db.execute({
    sql: "SELECT closing_day FROM credit_cards WHERE id = ? AND user_id = ?",
    args: [cardId, userId],
  });
  const card = cardRes.rows[0] as { closing_day: number } | undefined;
  if (!card) throw new Error("Card not found");

  const [year, mon] = month.split("-").map(Number);
  const period = getPeriod(card.closing_day, year, mon);

  const txResult = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
          WHERE card_id = ? AND user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
    args: [cardId, userId, period.start, period.end],
  });
  const totalPurchases = Number((txResult.rows[0] as { total: number }).total);

  const instRes = await db.execute({
    sql: `SELECT monthly_amount, start_month, total_months, remaining_months FROM installments
          WHERE card_id = ? AND user_id = ?`,
    args: [cardId, userId],
  });
  let totalInstallments = 0;
  let committedInstallments = 0;
  for (const row of instRes.rows as { monthly_amount: number; start_month: string; total_months: number; remaining_months: number }[]) {
    if (row.remaining_months > 0) {
      if (isMonthInRange(month, row.start_month, row.total_months)) {
        totalInstallments += Number(row.monthly_amount);
      }
      committedInstallments += Number(row.monthly_amount) * Math.max(0, Number(row.remaining_months) - 1);
    }
  }

  const cbRes = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS total FROM cashback
          WHERE card_id = ? AND user_id = ? AND applied_month = ?`,
    args: [cardId, userId, month],
  });
  const totalCashback = Number((cbRes.rows[0] as { total: number }).total);

  const statementBalance = totalPurchases + totalInstallments - totalCashback;

  return {
    total_purchases: totalPurchases,
    total_installments: totalInstallments,
    total_cashback: totalCashback,
    statement_balance: statementBalance,
    committed_installments: committedInstallments,
    total_committed: statementBalance + committedInstallments,
  };
}

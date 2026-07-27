import { getDb } from "@/lib/db/client.ts";
import type { CalculatedDebt } from "@/lib/types/card-monthly.ts";

function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const totalM = m - 1 + n;
  const newY = y + Math.floor(totalM / 12);
  const newM = totalM % 12 + 1;
  const lastDay = new Date(newY, newM, 0).getDate();
  const newD = Math.min(d, lastDay);
  return `${newY}-${String(newM).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getPeriod(cutoffDay: number, year: number, month: number): { start: string; end: string } {
  const endDay = Math.min(cutoffDay, daysInMonth(year, month));
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const startDay = Math.min(cutoffDay + 1, daysInMonth(prevYear, prevMonth));
  return {
    start: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
  };
}

export async function calculateCardDebt(cardId: string, month: string, userId: string): Promise<CalculatedDebt> {
  const db = getDb();

  const cardRes = await db.execute({
    sql: "SELECT cutoff_day FROM cards WHERE id = ? AND user_id = ?",
    args: [cardId, userId],
  });
  const card = cardRes.rows[0] as { cutoff_day: number | null } | undefined;
  if (!card) throw new Error("Card not found");

  const [year, mon] = month.split("-").map(Number);
  const cutoffDay = card.cutoff_day ?? daysInMonth(year, mon);
  const period = getPeriod(cutoffDay, year, mon);

  const txResult = await db.execute({
    sql: `SELECT COALESCE(SUM(t.amount), 0) AS total FROM transactions t
          LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
          WHERE pm.card_id = ? AND t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date <= ?`,
    args: [cardId, userId, period.start, period.end],
  });
  const totalPurchases = Number((txResult.rows[0] as { total: number }).total);

  const instRes = await db.execute({
    sql: `SELECT i.monthly_amount, i.start_date, i.total_months FROM installments i
          LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
          WHERE pm.card_id = ? AND i.user_id = ?`,
    args: [cardId, userId],
  });
  let totalInstallments = 0;
  let committedInstallments = 0;
  for (const row of instRes.rows as { monthly_amount: number; start_date: string; total_months: number }[]) {
    const { start_date, total_months, monthly_amount } = row;
    let found = false;
    for (let n = 0; n < total_months; n++) {
      const payDate = addMonths(start_date, n);
      if (payDate >= period.start && payDate <= period.end) {
        totalInstallments += Number(monthly_amount);
        committedInstallments += Number(monthly_amount) * (total_months - n - 1);
        found = true;
        break;
      }
    }
    if (!found && total_months > 0) {
      let futurePayments = 0;
      for (let n = 0; n < total_months; n++) {
        if (addMonths(start_date, n) > period.end) futurePayments++;
      }
      committedInstallments += Number(monthly_amount) * futurePayments;
    }
  }

  const cbRes = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS total FROM cashback
          WHERE card_id = ? AND user_id = ? AND date >= ? AND date <= ?`,
    args: [cardId, userId, period.start, period.end],
  });
  const totalCashback = Number((cbRes.rows[0] as { total: number }).total);

  const rpRes = await db.execute({
    sql: `SELECT COALESCE(SUM(rpm.amount), 0) AS total FROM recurring_payment_monthly rpm
          JOIN payment_methods pm ON pm.id = rpm.payment_method_id
          WHERE pm.card_id = ? AND rpm.user_id = ? AND rpm.month = ? AND rpm.is_paid = 1 AND rpm.type = 'expense'`,
    args: [cardId, userId, month],
  });
  const totalRecurring = Number((rpRes.rows[0] as { total: number }).total);

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

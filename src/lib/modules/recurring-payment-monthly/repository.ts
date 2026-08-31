import { getDb } from "@/lib/db/client.ts";
import type { RecurringPaymentMonthly, RecurringPaymentMonthlyUpdate } from "@/lib/types/recurring-payment.ts";

export class RecurringPaymentMonthlyRepository {
  async findByMonth(month: string, userId: string): Promise<RecurringPaymentMonthly[]> {
    const result = await getDb().execute({
      sql: `SELECT sm.*, rs.name, rs.default_amount, rs.currency,
            pm.name AS payment_method_name, pm.icon AS payment_method_icon, pm.type AS payment_method_type
            FROM recurring_payment_monthly sm
            INNER JOIN recurring_payments rs ON rs.id = sm.payment_id
            LEFT JOIN payment_methods pm ON pm.id = sm.payment_method_id
            WHERE sm.month = ? AND rs.user_id = ? AND sm.is_active = 1
            ORDER BY rs.name ASC`,
      args: [month, userId],
    });
    return (result.rows as unknown as RecurringPaymentMonthly[]).map(r => ({
      ...r, amount: Number(r.amount), is_active: Boolean(r.is_active), is_paid: Boolean(r.is_paid),
    }));
  }

  async update(id: string, data: RecurringPaymentMonthlyUpdate, userId: string): Promise<boolean> {
    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id || null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id || null); }
    if (data.is_active !== undefined) { sets.push("is_active = ?"); args.push(data.is_active ? 1 : 0); }
    if (data.is_paid !== undefined) { sets.push("is_paid = ?", "paid_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END"); args.push(data.is_paid ? 1 : 0, data.is_paid ? 1 : 0); }

    if (sets.length === 0) return false;

    args.push(id, userId);
    const result = await getDb().execute({
      sql: `UPDATE recurring_payment_monthly SET ${sets.join(", ")}
            WHERE id = ? AND payment_id IN (SELECT id FROM recurring_payments WHERE user_id = ?)`,
      args,
    });
    return result.rowsAffected > 0;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM recurring_payment_monthly WHERE id = ? AND payment_id IN (SELECT id FROM recurring_payments WHERE user_id = ?)",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }

  async getHistory(month: string, userId: string): Promise<RecurringPaymentMonthly[]> {
    const result = await getDb().execute({
      sql: `SELECT sm.*, rs.name, rs.default_amount, rs.currency,
            pm.name AS payment_method_name, pm.icon AS payment_method_icon, pm.type AS payment_method_type
            FROM recurring_payment_monthly sm
            INNER JOIN recurring_payments rs ON rs.id = sm.payment_id
            LEFT JOIN payment_methods pm ON pm.id = sm.payment_method_id
            WHERE rs.user_id = ? AND sm.is_active = 0 AND sm.month = ?
            ORDER BY rs.name ASC`,
      args: [userId, month],
    });
    return (result.rows as unknown as RecurringPaymentMonthly[]).map(r => ({
      ...r, amount: Number(r.amount), is_active: Boolean(r.is_active), is_paid: Boolean(r.is_paid),
    }));
  }

}

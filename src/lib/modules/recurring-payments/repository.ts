import { getDb } from "@/lib/server/db/client.ts";
import { nextSeq, scopedFindById, insertRow, now, type SqlValue } from "@/lib/server/db/utils.ts";
import { currentMonthStr } from "@/lib/date.ts";
import type { RecurringPayment, RecurringPaymentInput, RecurringPaymentMonthly, RecurringPaymentMonthlyUpdate } from "@/lib/types/recurring-payment.ts";

export function isValidRecurringPaymentDay(value: unknown): boolean {
  return value == null || (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31);
}

export class RecurringPaymentRepository {
  async findAll(userId: string): Promise<RecurringPayment[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT rp.*, c.name AS category_name, pm.name AS payment_method_name, pm.icon AS payment_method_icon, pm.type AS payment_method_type
            FROM recurring_payments rp
            LEFT JOIN categories c ON c.id = rp.category_id
            LEFT JOIN payment_methods pm ON pm.id = rp.payment_method_id
            WHERE rp.user_id = ? AND rp.archived_at IS NULL
            ORDER BY rp.name ASC`,
      args: [userId],
    });
    return result.rows as unknown as RecurringPayment[];
  }

  async findById(id: string, userId: string): Promise<RecurringPayment | null> {
    return scopedFindById<RecurringPayment>("recurring_payments", id, userId, "user_id = ? AND archived_at IS NULL");
  }

  async create(data: RecurringPaymentInput, userId: string): Promise<RecurringPayment> {
    return insertRow<RecurringPayment>("recurring_payments", userId, [
      "name", "default_amount", "currency", "type", "category_id", "payment_method_id", "scheduled_day",
    ], [
      data.name, data.default_amount, data.currency ?? "MXN", data.type ?? "expense", data.category_id || null, data.payment_method_id, data.scheduled_day ?? null,
    ]);
  }

  async update(id: string, data: Partial<RecurringPaymentInput>, userId: string): Promise<RecurringPayment | null> {
    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.default_amount !== undefined) { sets.push("default_amount = ?"); args.push(data.default_amount); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id || null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id); }
    if (data.scheduled_day !== undefined) { sets.push("scheduled_day = ?"); args.push(data.scheduled_day); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }

    if (sets.length === 0) return this.findById(id, userId);

    const updateTemplate = {
      sql: `UPDATE recurring_payments SET ${sets.join(", ")}, updated_at = ?
            WHERE id = ? AND user_id = ? AND archived_at IS NULL RETURNING *`,
      args: [...args, now(), id, userId],
    };
    const db = getDb();
    const result = data.scheduled_day === undefined
      ? await db.execute(updateTemplate)
      : (await db.batch([
          updateTemplate,
          {
            sql: `UPDATE recurring_payment_monthly SET scheduled_day = ?
                  WHERE payment_id = ? AND user_id = ? AND month >= ?
                    AND EXISTS (
                      SELECT 1 FROM recurring_payments
                      WHERE id = ? AND user_id = ? AND archived_at IS NULL
                    )`,
            args: [data.scheduled_day, id, userId, currentMonthStr(), id, userId],
          },
        ], "write"))[0];
    return (result.rows[0] as unknown as RecurringPayment | undefined) ?? null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const [, archived] = await getDb().batch([
      {
        sql: `DELETE FROM recurring_payment_monthly
              WHERE user_id = ? AND month > ? AND is_paid = 0
                AND payment_id IN (
                  SELECT id FROM recurring_payments WHERE id = ? AND user_id = ? AND archived_at IS NULL
                )`,
        args: [userId, currentMonthStr(), id, userId],
      },
      {
        sql: "UPDATE recurring_payments SET archived_at = ? WHERE id = ? AND user_id = ? AND archived_at IS NULL",
        args: [now(), id, userId],
      },
      {
        sql: `DELETE FROM recurring_payments
              WHERE id = ? AND user_id = ? AND archived_at IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM recurring_payment_monthly WHERE payment_id = recurring_payments.id)`,
        args: [id, userId],
      },
    ], "write");
    return archived.rowsAffected > 0;
  }

  async upsertMonthly(
    paymentId: string,
    month: string,
    data: RecurringPaymentMonthlyUpdate & { amount: number },
    userId: string,
  ): Promise<RecurringPaymentMonthly | null> {
    const sets = ["amount = excluded.amount"];
    const updateArgs: SqlValue[] = [];
    if (data.category_id !== undefined) { sets.push("category_id = ?"); updateArgs.push(data.category_id || null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); updateArgs.push(data.payment_method_id || null); }
    if (data.is_active !== undefined) sets.push("is_active = excluded.is_active");
    if (data.is_paid !== undefined) sets.push("is_paid = excluded.is_paid");
    const seq = await nextSeq("recurring_payment_monthly");
    const result = await getDb().execute({
      sql: `INSERT INTO recurring_payment_monthly (id, user_id, payment_id, month, amount, type, category_id, payment_method_id, scheduled_day, is_active, is_paid, seq, created_at)
            SELECT ?, rp.user_id, rp.id, ?, COALESCE(?, rp.default_amount), rp.type,
                   NULLIF(COALESCE(?, rp.category_id), ''), COALESCE(?, rp.payment_method_id), rp.scheduled_day, ?, ?, ?, ?
            FROM recurring_payments rp
            WHERE rp.id = ? AND rp.user_id = ? AND rp.archived_at IS NULL
            ON CONFLICT(payment_id, month) DO UPDATE SET ${sets.join(", ")}
            RETURNING *`,
      args: [
        crypto.randomUUID(), month, data.amount, data.category_id ?? null, data.payment_method_id ?? null,
        data.is_active !== false ? 1 : 0, data.is_paid ? 1 : 0, seq, now(), paymentId, userId, ...updateArgs,
      ],
    });
    const row = result.rows[0] as unknown as RecurringPaymentMonthly | undefined;
    if (!row) return null;
    return { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active), is_paid: Boolean(row.is_paid) };
  }

  async getHistory(userId: string, fromMonth: string, toMonth: string): Promise<RecurringPaymentMonthly[]> {
    const result = await getDb().execute({
      sql: `SELECT sm.*, rs.name, rs.default_amount, rs.currency
            FROM recurring_payment_monthly sm
            INNER JOIN recurring_payments rs ON rs.id = sm.payment_id
            WHERE sm.user_id = ? AND sm.month >= ? AND sm.month <= ?
            ORDER BY sm.month DESC, rs.name ASC`,
      args: [userId, fromMonth, toMonth],
    });
    return (result.rows as unknown as RecurringPaymentMonthly[]).map(r => ({
      ...r, amount: Number(r.amount), is_active: Boolean(r.is_active), is_paid: Boolean(r.is_paid),
    }));
  }

  async getMonthServices(month: string, userId: string): Promise<RecurringPaymentMonthly[]> {
    const result = await getDb().execute({
      sql: `SELECT sm.*, pm.name AS payment_method_name, pm.icon AS payment_method_icon
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
}

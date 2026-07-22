import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import { localISOString } from "@/lib/date.ts";
import type { RecurringPayment, RecurringPaymentInput, RecurringPaymentMonthly, RecurringPaymentMonthlyUpdate } from "@/lib/types/recurring-payment.ts";

export class RecurringPaymentRepository {
  async findAll(userId: string): Promise<RecurringPayment[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT rp.*, c.name AS category_name, pm.name AS payment_method_name, pm.icon AS payment_method_icon
            FROM recurring_payments rp
            LEFT JOIN categories c ON c.id = rp.category_id
            LEFT JOIN payment_methods pm ON pm.id = rp.payment_method_id
            WHERE rp.user_id = ?
            ORDER BY rp.name ASC`,
      args: [userId],
    });
    return result.rows as unknown as RecurringPayment[];
  }

  async findById(id: string, userId: string): Promise<RecurringPayment | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM recurring_payments WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as RecurringPayment | undefined) ?? null;
  }

  async create(data: RecurringPaymentInput, userId: string): Promise<RecurringPayment> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("recurring_payments");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO recurring_payments (id, user_id, name, default_amount, category_id, payment_method_id, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.name, data.default_amount, data.category_id ?? null, data.payment_method_id ?? null, seq, now, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM recurring_payments WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as RecurringPayment;
  }

  async update(id: string, data: Partial<RecurringPaymentInput>, userId: string): Promise<RecurringPayment | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.default_amount !== undefined) { sets.push("default_amount = ?"); args.push(data.default_amount); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id ?? null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(localISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE recurring_payments SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM recurring_payments WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as RecurringPayment;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM recurring_payments WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }

  async getMonthly(paymentId: string, month: string): Promise<RecurringPaymentMonthly | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM recurring_payment_monthly WHERE payment_id = ? AND month = ?",
      args: [paymentId, month],
    });
    const row = result.rows[0] as unknown as RecurringPaymentMonthly | undefined;
    if (!row) return null;
    return { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active), is_paid: Boolean(row.is_paid) };
  }

  async upsertMonthly(paymentId: string, month: string, data: RecurringPaymentMonthlyUpdate, userId: string): Promise<RecurringPaymentMonthly> {
    const db = getDb();
    const existing = await this.getMonthly(paymentId, month);

    if (existing) {
      const sets: string[] = [];
      const args: (string | number | boolean | null)[] = [];
      if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
      if (data.is_active !== undefined) { sets.push("is_active = ?"); args.push(data.is_active ? 1 : 0); }
      if (data.is_paid !== undefined) { sets.push("is_paid = ?"); args.push(data.is_paid ? 1 : 0); }
      if (sets.length > 0) {
        args.push(paymentId, month);
        await db.execute({
          sql: `UPDATE recurring_payment_monthly SET ${sets.join(", ")} WHERE payment_id = ? AND month = ?`,
          args,
        });
      }
      return (await this.getMonthly(paymentId, month))!;
    }

    const id = crypto.randomUUID();
    const svc = await db.execute({
      sql: "SELECT default_amount, category_id, payment_method_id FROM recurring_payments WHERE id = ?",
      args: [paymentId],
    });
    const defaultAmount = Number(svc.rows[0]?.default_amount ?? data.amount ?? 0);
    const categoryId = (svc.rows[0] as Record<string, unknown>)?.category_id ?? null;
    const paymentMethodId = (svc.rows[0] as Record<string, unknown>)?.payment_method_id ?? null;
    const seq = await nextSeq("recurring_payment_monthly");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO recurring_payment_monthly (id, user_id, payment_id, month, amount, category_id, payment_method_id, is_active, is_paid, seq, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, paymentId, month, data.amount ?? defaultAmount, categoryId, paymentMethodId, data.is_active !== false ? 1 : 0, data.is_paid ? 1 : 0, seq, now],
    });

    return (await this.getMonthly(paymentId, month))!;
  }

  async getMonthServices(month: string, userId: string): Promise<RecurringPaymentMonthly[]> {
    const result = await getDb().execute({
      sql: `SELECT sm.* FROM recurring_payment_monthly sm
            INNER JOIN recurring_payments rs ON rs.id = sm.payment_id
            WHERE sm.month = ? AND rs.user_id = ? AND sm.is_active = 1
            ORDER BY rs.name ASC`,
      args: [month, userId],
    });
    return (result.rows as unknown as RecurringPaymentMonthly[]).map(r => ({
      ...r, amount: Number(r.amount), is_active: Boolean(r.is_active), is_paid: Boolean(r.is_paid),
    }));
  }
}

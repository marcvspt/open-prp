import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, scopedDelete, insertRow, applyUpdate, now, type SqlValue } from "@/lib/db/utils.ts";
import { addMonths, lastDayOfMonth } from "@/lib/date.ts";
import type { Installment, InstallmentInput, InstallmentFilter } from "@/lib/types/installment.ts";

function computeRemaining(startDate: string, totalMonths: number): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let paid = 0;
  for (let n = 0; n < totalMonths; n++) {
    const pd = addMonths(startDate, n);
    const [y, m, d] = pd.split("-").map(Number);
    if (new Date(y, m - 1, d) <= today) paid++;
    else break;
  }
  return Math.max(0, totalMonths - paid);
}

export class InstallmentRepository {
  async findAll(userId: string, filter?: InstallmentFilter): Promise<Installment[]> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.category_id) { conditions.push("category_id = ?"); args.push(filter.category_id); }
    if (filter?.payment_method_id) { conditions.push("payment_method_id = ?"); args.push(filter.payment_method_id); }
    if (filter?.q) { conditions.push("description LIKE ?"); args.push(`%${filter.q}%`); }

    const result = await db.execute({
      sql: `SELECT * FROM installments WHERE ${conditions.join(" AND ")} ORDER BY start_date DESC`,
      args,
    });
    const rows = result.rows as unknown as Installment[];
    const currentMonthStart = `${now().slice(0, 7)}-01`;
    const monthFilter = filter?.month || (filter?.active_only ? undefined : undefined);
    const targetMonthStart = monthFilter ? `${monthFilter}-01` : currentMonthStart;
    const computedRows: Installment[] = [];
    for (const r of rows) {
      const computed = computeRemaining(r.start_date, r.total_months);
      if (computed !== r.remaining_months) {
        await db.execute({ sql: "UPDATE installments SET remaining_months = ?, updated_at = ? WHERE id = ?", args: [computed, now(), r.id] });
      }
      computedRows.push({ ...r, remaining_months: computed });
      // Active = its last payment falls in the month or later, so an
      // installment stays visible during its final month.
    }
    return computedRows.filter(i => {
      const lastPaymentDate = addMonths(i.start_date, Math.max(0, i.total_months - 1));
      if (filter?.month) {
        const monthEnd = lastDayOfMonth(filter.month);
        return i.start_date <= monthEnd && lastPaymentDate >= targetMonthStart;
      }
      if (filter?.active_only) return lastPaymentDate >= targetMonthStart;
      if (filter?.date_from || filter?.date_to) {
        return (!filter.date_from || lastPaymentDate >= filter.date_from) && (!filter.date_to || i.start_date <= filter.date_to);
      }
      return true;
    });
  }

  async findById(id: string, userId: string): Promise<Installment | null> {
    const db = getDb();
    const row = await scopedFindById<Installment>("installments", id, userId);
    if (!row) return null;
    const computed = computeRemaining(row.start_date, row.total_months);
    if (computed !== row.remaining_months) {
      await db.execute({ sql: "UPDATE installments SET remaining_months = ?, updated_at = ? WHERE id = ?", args: [computed, now(), row.id] });
    }
    return { ...row, remaining_months: computed };
  }

  async create(data: InstallmentInput, userId: string): Promise<Installment> {
    return insertRow<Installment>("installments", userId, [
      "category_id", "payment_method_id", "description", "total_amount", "monthly_amount",
      "total_months", "remaining_months", "start_date", "currency",
    ], [
      data.category_id || null,
      data.payment_method_id,
      data.description, data.total_amount,
      data.monthly_amount, data.total_months,
      data.remaining_months ?? data.total_months,
      data.start_date, data.currency ?? "MXN",
    ]);
  }

  async update(id: string, data: Partial<InstallmentInput>, userId: string): Promise<Installment | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.total_amount !== undefined) { sets.push("total_amount = ?"); args.push(data.total_amount); }
    if (data.monthly_amount !== undefined) { sets.push("monthly_amount = ?"); args.push(data.monthly_amount); }
    if (data.total_months !== undefined) { sets.push("total_months = ?"); args.push(data.total_months); }
    if (data.remaining_months !== undefined) { sets.push("remaining_months = ?"); args.push(data.remaining_months); }
    if (data.start_date !== undefined) { sets.push("start_date = ?"); args.push(data.start_date); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id || null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id); }

    return applyUpdate<Installment>("installments", id, userId, sets, args, { existing });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return scopedDelete("installments", id, userId);
  }
}

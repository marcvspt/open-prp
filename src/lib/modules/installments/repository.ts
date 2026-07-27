import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import { localISOString } from "@/lib/date.ts";
import type { Installment, InstallmentInput, InstallmentFilter } from "@/lib/types/installment.ts";

function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const totalM = m - 1 + n;
  const newY = y + Math.floor(totalM / 12);
  const newM = totalM % 12 + 1;
  const lastDay = new Date(newY, newM, 0).getDate();
  const newD = Math.min(d, lastDay);
  return `${newY}-${String(newM).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
}

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

    const result = await db.execute({
      sql: `SELECT * FROM installments WHERE ${conditions.join(" AND ")} ORDER BY start_date DESC`,
      args,
    });
    const rows = result.rows as unknown as Installment[];
    const now = localISOString();
    const currentMonthStart = `${now.slice(0, 7)}-01`;
    return rows.map(r => {
      const computed = computeRemaining(r.start_date, r.total_months);
      if (computed !== r.remaining_months) {
        db.execute({ sql: "UPDATE installments SET remaining_months = ?, updated_at = ? WHERE id = ?", args: [computed, now, r.id] });
      }
      return { ...r, remaining_months: computed };
      // Active = its last payment falls in the current month or later, so an
      // installment stays visible (and counted in the month's debt) during its final month.
    }).filter(i => !filter?.active_only || addMonths(i.start_date, Math.max(0, i.total_months - 1)) >= currentMonthStart);
  }

  async findById(id: string, userId: string): Promise<Installment | null> {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM installments WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    const row = result.rows[0] as unknown as Installment | undefined;
    if (!row) return null;
    const computed = computeRemaining(row.start_date, row.total_months);
    if (computed !== row.remaining_months) {
      db.execute({ sql: "UPDATE installments SET remaining_months = ?, updated_at = ? WHERE id = ?", args: [computed, localISOString(), row.id] });
    }
    return { ...row, remaining_months: computed };
  }

  async create(data: InstallmentInput, userId: string): Promise<Installment> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("installments");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO installments (id, user_id, category_id, payment_method_id, description, total_amount, monthly_amount, total_months, remaining_months, start_date, currency, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.category_id ?? null,
        data.payment_method_id,
        data.description, data.total_amount,
        data.monthly_amount, data.total_months,
        data.remaining_months ?? data.total_months,
        data.start_date, data.currency ?? "MXN", seq, now, now,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM installments WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Installment;
  }

  async update(id: string, data: Partial<InstallmentInput>, userId: string): Promise<Installment | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.total_amount !== undefined) { sets.push("total_amount = ?"); args.push(data.total_amount); }
    if (data.monthly_amount !== undefined) { sets.push("monthly_amount = ?"); args.push(data.monthly_amount); }
    if (data.total_months !== undefined) { sets.push("total_months = ?"); args.push(data.total_months); }
    if (data.remaining_months !== undefined) { sets.push("remaining_months = ?"); args.push(data.remaining_months); }
    if (data.start_date !== undefined) { sets.push("start_date = ?"); args.push(data.start_date); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id ?? null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(localISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE installments SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM installments WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Installment;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM installments WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

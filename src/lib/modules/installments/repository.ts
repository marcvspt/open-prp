import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import { localISOString } from "@/lib/date.ts";
import type { Installment, InstallmentInput, InstallmentFilter } from "@/lib/types/installment.ts";

export class InstallmentRepository {
  async findAll(userId: string, filter?: InstallmentFilter): Promise<Installment[]> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.card_id) { conditions.push("card_id = ?"); args.push(filter.card_id); }
    if (filter?.active_only) { conditions.push("remaining_months > 0"); }

    const result = await db.execute({
      sql: `SELECT * FROM installments WHERE ${conditions.join(" AND ")} ORDER BY remaining_months ASC, start_month DESC`,
      args,
    });
    return result.rows as unknown as Installment[];
  }

  async findById(id: string, userId: string): Promise<Installment | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM installments WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Installment | undefined) ?? null;
  }

  async create(data: InstallmentInput, userId: string): Promise<Installment> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("installments");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO installments (id, user_id, category_id, payment_method_id, card_id, description, total_amount, monthly_amount, total_months, remaining_months, start_month, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.category_id ?? null,
        data.payment_method_id ?? null, data.card_id ?? null,
        data.description, data.total_amount,
        data.monthly_amount, data.total_months,
        data.remaining_months ?? data.total_months,
        data.start_month, seq, now, now,
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
    if (data.start_month !== undefined) { sets.push("start_month = ?"); args.push(data.start_month); }
    if (data.card_id !== undefined) { sets.push("card_id = ?"); args.push(data.card_id ?? null); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id ?? null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id ?? null); }

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

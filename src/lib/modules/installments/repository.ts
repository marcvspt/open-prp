import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { Installment, InstallmentInput, InstallmentFilter } from "../../types/installment";

export class InstallmentRepository {
  async findAll(userId: string, filter?: InstallmentFilter): Promise<Installment[]> {
    const db = getDb();
    const conditions: string[] = [];
    const args: any[] = [];
    const scope = filter?.scope ?? "personal";

    if (scope === "personal") {
      conditions.push("user_id = ? AND family_id IS NULL");
      args.push(userId);
    } else if (scope === "family" && filter?.family_id) {
      conditions.push("family_id = ?");
      args.push(filter.family_id);
    } else if (scope === "all") {
      conditions.push("(user_id = ? OR family_id = ?)");
      args.push(userId, filter?.family_id ?? "");
    } else {
      conditions.push("user_id = ? AND family_id IS NULL");
      args.push(userId);
    }

    if (filter?.card_id) { conditions.push("card_id = ?"); args.push(filter.card_id); }
    if (filter?.active_only) { conditions.push("remaining_months > 0"); }

    const result = await db.execute({
      sql: `SELECT * FROM installments WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
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
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO installments (id, user_id, card_id, family_id, description, total_amount, monthly_amount, total_months, remaining_months, start_month, category, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.card_id ?? null, data.family_id ?? null,
        data.description, data.total_amount, data.monthly_amount,
        data.total_months, data.remaining_months ?? data.total_months,
        data.start_month, data.category ?? null, seq, now, now,
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
    const args: any[] = [];

    if (data.card_id !== undefined) { sets.push("card_id = ?"); args.push(data.card_id ?? null); }
    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.total_amount !== undefined) { sets.push("total_amount = ?"); args.push(data.total_amount); }
    if (data.monthly_amount !== undefined) { sets.push("monthly_amount = ?"); args.push(data.monthly_amount); }
    if (data.total_months !== undefined) { sets.push("total_months = ?"); args.push(data.total_months); }
    if (data.remaining_months !== undefined) { sets.push("remaining_months = ?"); args.push(data.remaining_months); }
    if (data.start_month !== undefined) { sets.push("start_month = ?"); args.push(data.start_month); }
    if (data.category !== undefined) { sets.push("category = ?"); args.push(data.category ?? null); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
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

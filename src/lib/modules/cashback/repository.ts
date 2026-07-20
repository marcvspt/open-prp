import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { Cashback, CashbackInput } from "../../types/cashback";

export class CashbackRepository {
  async findAll(userId: string, cardId?: string): Promise<Cashback[]> {
    const db = getDb();
    const conditions = ["user_id = ?"];
    const args: any[] = [userId];

    if (cardId) { conditions.push("card_id = ?"); args.push(cardId); }

    const result = await db.execute({
      sql: `SELECT * FROM cashback WHERE ${conditions.join(" AND ")} ORDER BY date DESC`,
      args,
    });
    return result.rows as unknown as Cashback[];
  }

  async findById(id: string, userId: string): Promise<Cashback | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM cashback WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Cashback | undefined) ?? null;
  }

  async create(data: CashbackInput, userId: string): Promise<Cashback> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("cashback");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO cashback (id, user_id, card_id, amount, description, date, applied_month, seq, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.card_id ?? null, data.amount, data.description ?? null, data.date, data.applied_month ?? null, seq, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM cashback WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Cashback;
  }

  async update(id: string, data: Partial<CashbackInput>, userId: string): Promise<Cashback | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.card_id !== undefined) { sets.push("card_id = ?"); args.push(data.card_id ?? null); }
    if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description ?? null); }
    if (data.date !== undefined) { sets.push("date = ?"); args.push(data.date); }
    if (data.applied_month !== undefined) { sets.push("applied_month = ?"); args.push(data.applied_month ?? null); }

    if (sets.length === 0) return existing;

    args.push(id, userId);
    await db.execute({
      sql: `UPDATE cashback SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM cashback WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Cashback;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM cashback WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

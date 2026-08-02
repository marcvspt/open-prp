import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, scopedDelete, insertRow, applyUpdate, type SqlValue } from "@/lib/db/utils.ts";
import { lastDayOfMonth } from "@/lib/date.ts";
import type { Cashback, CashbackInput } from "@/lib/types/cashback.ts";

export class CashbackRepository {
  async findAll(userId: string, filter?: { card_id?: string; q?: string; month?: string; date_from?: string; date_to?: string }): Promise<Cashback[]> {
    const db = getDb();
    const conditions = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.card_id) { conditions.push("card_id = ?"); args.push(filter.card_id); }
    if (filter?.q) { conditions.push("description LIKE ?"); args.push(`%${filter.q}%`); }
    if (filter?.month) {
      conditions.push("date >= ? AND date <= ?");
      args.push(`${filter.month}-01`, lastDayOfMonth(filter.month));
    }
    if (filter?.date_from) { conditions.push("date >= ?"); args.push(filter.date_from); }
    if (filter?.date_to) { conditions.push("date <= ?"); args.push(filter.date_to); }

    const result = await db.execute({
      sql: `SELECT * FROM cashback WHERE ${conditions.join(" AND ")} ORDER BY date DESC`,
      args,
    });
    return result.rows as unknown as Cashback[];
  }

  async findById(id: string, userId: string): Promise<Cashback | null> {
    return scopedFindById<Cashback>("cashback", id, userId);
  }

  async create(data: CashbackInput, userId: string): Promise<Cashback> {
    return insertRow<Cashback>("cashback", userId, [
      "card_id", "amount", "currency", "description", "date",
    ], [
      data.card_id, data.amount, data.currency ?? "MXN", data.description ?? null, data.date,
    ], { withUpdatedAt: false });
  }

  async update(id: string, data: Partial<CashbackInput>, userId: string): Promise<Cashback | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.card_id !== undefined) { sets.push("card_id = ?"); args.push(data.card_id); }
    if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description ?? null); }
    if (data.date !== undefined) { sets.push("date = ?"); args.push(data.date); }

    return applyUpdate<Cashback>("cashback", id, userId, sets, args, { existing });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return scopedDelete("cashback", id, userId);
  }
}

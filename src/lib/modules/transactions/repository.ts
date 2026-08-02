import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, scopedDelete, insertRow, applyUpdate, type SqlValue } from "@/lib/db/utils.ts";
import { lastDayOfMonth } from "@/lib/date.ts";
import type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from "@/lib/types/transaction.ts";

export class TransactionRepository {
  async findAll(userId: string, filter?: TransactionFilter): Promise<Transaction[]> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.type) { conditions.push("type = ?"); args.push(filter.type); }
    if (filter?.category_id) { conditions.push("category_id = ?"); args.push(filter.category_id); }
    if (filter?.payment_method_id) { conditions.push("payment_method_id = ?"); args.push(filter.payment_method_id); }
    if (filter?.q) { conditions.push("description LIKE ?"); args.push(`%${filter.q}%`); }
    if (filter?.month) {
      conditions.push("date >= ? AND date <= ?");
      args.push(`${filter.month}-01`, lastDayOfMonth(filter.month));
    }
    if (filter?.date_from) { conditions.push("date >= ?"); args.push(filter.date_from); }
    if (filter?.date_to) { conditions.push("date <= ?"); args.push(filter.date_to); }

    const result = await db.execute({
      sql: `SELECT * FROM transactions WHERE ${conditions.join(" AND ")} ORDER BY date DESC, created_at DESC`,
      args,
    });
    return result.rows as unknown as Transaction[];
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    return scopedFindById<Transaction>("transactions", id, userId);
  }

  async create(data: CreateTransactionInput, userId: string): Promise<Transaction> {
    return insertRow<Transaction>("transactions", userId, [
      "type", "amount", "description", "category_id", "payment_method_id", "date", "currency",
    ], [
      data.type, data.amount, data.description ?? null,
      data.category_id || null, data.payment_method_id,
      data.date, data.currency ?? "USD",
    ]);
  }

  async update(id: string, data: UpdateTransactionInput, userId: string): Promise<Transaction | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description ?? null); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id || null); }
    if (data.date !== undefined) { sets.push("date = ?"); args.push(data.date); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }

    return applyUpdate<Transaction>("transactions", id, userId, sets, args, { existing });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return scopedDelete("transactions", id, userId);
  }
}

import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from "@/lib/types/transaction.ts";

export class TransactionRepository {
  async findAll(userId: string, filter?: TransactionFilter): Promise<Transaction[]> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.type) { conditions.push("type = ?"); args.push(filter.type); }
    if (filter?.category_id) { conditions.push("category_id = ?"); args.push(filter.category_id); }
    if (filter?.date_from) { conditions.push("date >= ?"); args.push(filter.date_from); }
    if (filter?.date_to) { conditions.push("date <= ?"); args.push(filter.date_to); }

    const result = await db.execute({
      sql: `SELECT * FROM transactions WHERE ${conditions.join(" AND ")} ORDER BY date DESC, created_at DESC`,
      args,
    });
    return result.rows as unknown as Transaction[];
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Transaction | undefined) ?? null;
  }

  async create(data: CreateTransactionInput, userId: string): Promise<Transaction> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("transactions");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO transactions (id, user_id, type, amount, description, category_id, payment_method_id, date, currency, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.type, data.amount, data.description ?? null,
        data.category_id || null, data.payment_method_id || null,
        data.date, data.currency ?? "USD",
        seq, now, now,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM transactions WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Transaction;
  }

  async update(id: string, data: UpdateTransactionInput, userId: string): Promise<Transaction | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description ?? null); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id || null); }
    if (data.date !== undefined) { sets.push("date = ?"); args.push(data.date); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id || null); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE transactions SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM transactions WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Transaction;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM transactions WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

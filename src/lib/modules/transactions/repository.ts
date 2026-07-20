import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from "../../types/transaction";

export class TransactionRepository {
  async findAll(userId: string, filter?: TransactionFilter): Promise<Transaction[]> {
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
      sql: `INSERT INTO transactions (id, user_id, type, amount, description, category_id, payment_method_id, date, card_id, installment_id, family_id, currency, is_recurring, recurrence_rule, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.type, data.amount, data.description ?? null,
        data.category_id ?? null, data.payment_method_id || null,
        data.date, data.card_id ?? null,
        data.installment_id ?? null, data.family_id ?? null,
        data.currency ?? "USD", data.is_recurring ? 1 : 0,
        data.recurrence_rule ?? null, seq, now, now,
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
    const args: any[] = [];

    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description ?? null); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id ?? null); }
    if (data.date !== undefined) { sets.push("date = ?"); args.push(data.date); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id ?? null); }
    if (data.card_id !== undefined) { sets.push("card_id = ?"); args.push(data.card_id ?? null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id || null); }
    if (data.installment_id !== undefined) { sets.push("installment_id = ?"); args.push(data.installment_id ?? null); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
    if (data.is_recurring !== undefined) { sets.push("is_recurring = ?"); args.push(data.is_recurring ? 1 : 0); }
    if (data.recurrence_rule !== undefined) { sets.push("recurrence_rule = ?"); args.push(data.recurrence_rule ?? null); }

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

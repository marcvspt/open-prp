import { getDb } from "@/lib/db/client.ts";
import { localISOString } from "@/lib/date.ts";
import type { CardMonthly, CardMonthlyInput, CardMonthlyUpdate } from "@/lib/types/card-monthly.ts";

export class CardMonthlyRepository {
  async findByMonth(month: string, userId: string): Promise<CardMonthly[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT cm.* FROM card_monthly cm
            INNER JOIN cards cc ON cc.id = cm.card_id
            WHERE cm.month = ? AND cm.user_id = ?
            ORDER BY cc.name ASC`,
      args: [month, userId],
    });
    return (result.rows as unknown as CardMonthly[]).map(r => ({
      ...r,
      statement_balance: Number(r.statement_balance),
      is_paid: Boolean(r.is_paid),
    }));
  }

  async findById(id: string, userId: string): Promise<CardMonthly | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM card_monthly WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    const row = result.rows[0] as unknown as CardMonthly | undefined;
    if (!row) return null;
    return { ...row, statement_balance: Number(row.statement_balance), is_paid: Boolean(row.is_paid) };
  }

  async upsert(data: CardMonthlyInput, userId: string): Promise<CardMonthly> {
    const db = getDb();
    const existing = await db.execute({
      sql: "SELECT * FROM card_monthly WHERE card_id = ? AND month = ?",
      args: [data.card_id, data.month],
    });
    const now = localISOString();

    if (existing.rows.length > 0) {
      await db.execute({
        sql: `UPDATE card_monthly SET statement_balance = ?, updated_at = ? WHERE card_id = ? AND month = ?`,
        args: [data.statement_balance, now, data.card_id, data.month],
      });
    } else {
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO card_monthly (id, card_id, user_id, month, statement_balance, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, data.card_id, userId, data.month, data.statement_balance, now, now],
      });
    }

    const result = await db.execute({
      sql: "SELECT * FROM card_monthly WHERE card_id = ? AND month = ?",
      args: [data.card_id, data.month],
    });
    const row = result.rows[0] as unknown as CardMonthly;
    return { ...row, statement_balance: Number(row.statement_balance), is_paid: Boolean(row.is_paid) };
  }

  async togglePaid(id: string, userId: string, isPaid: boolean, paidAt?: string): Promise<CardMonthly | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const now = localISOString();
    await db.execute({
      sql: `UPDATE card_monthly SET is_paid = ?, paid_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      args: [isPaid ? 1 : 0, isPaid ? (paidAt ?? now) : null, now, id, userId],
    });

    return this.findById(id, userId);
  }

  async getHistory(userId: string, limit = 12): Promise<CardMonthly[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT cm.* FROM card_monthly cm
            INNER JOIN cards cc ON cc.id = cm.card_id
            WHERE cm.user_id = ?
            ORDER BY cm.month DESC, cc.name ASC
            LIMIT ?`,
      args: [userId, limit * 20],
    });
    return (result.rows as unknown as CardMonthly[]).map(r => ({
      ...r,
      statement_balance: Number(r.statement_balance),
      is_paid: Boolean(r.is_paid),
    }));
  }
}

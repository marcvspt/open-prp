import { getDb } from "@/lib/server/db/client.ts";
import { insertRow, now } from "@/lib/server/db/utils.ts";
import { addMonths, cardStatementPeriod } from "@/lib/date.ts";
import { CARRYOVER_DESCRIPTION_PREFIX } from "@/lib/modules/card-monthly/carryover.ts";
import type { CardMonthly, CardMonthlyInput, CardPaymentInput } from "@/lib/types/card-monthly.ts";
import type { Transaction } from "@/lib/types/transaction.ts";

function normalizeStatement(row: unknown): CardMonthly {
  const statement = row as CardMonthly;
  return {
    ...statement,
    statement_balance: Number(statement.statement_balance),
    paid_amount: Number(statement.paid_amount),
    is_paid: Boolean(statement.is_paid),
  };
}

export class CardMonthlyRepository {
  async findByMonth(month: string, userId: string): Promise<CardMonthly[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT cm.* FROM card_monthly cm
            INNER JOIN cards cc ON cc.id = cm.card_id AND cc.user_id = cm.user_id
            WHERE cm.month = ? AND cm.user_id = ?
            ORDER BY cc.name ASC`,
      args: [month, userId],
    });
    return result.rows.map(normalizeStatement);
  }

  async upsert(data: CardMonthlyInput, userId: string): Promise<boolean> {
    const timestamp = now();
    const result = await getDb().execute({
      sql: `INSERT INTO card_monthly (id, card_id, user_id, month, statement_balance, currency, created_at, updated_at)
            SELECT ?, id, user_id, ?, ?, ?, ?, ? FROM cards
            WHERE id = ? AND user_id = ? AND type = 'credit'
            ON CONFLICT(card_id, month) DO UPDATE SET
              statement_balance = CASE WHEN card_monthly.is_paid THEN card_monthly.statement_balance ELSE excluded.statement_balance END,
              currency = CASE WHEN card_monthly.is_paid THEN card_monthly.currency ELSE excluded.currency END,
              updated_at = CASE WHEN card_monthly.is_paid THEN card_monthly.updated_at ELSE excluded.updated_at END
            WHERE card_monthly.user_id = excluded.user_id`,
      args: [crypto.randomUUID(), data.month, data.statement_balance, data.currency, timestamp, timestamp, data.card_id, userId],
    });
    return result.rowsAffected > 0;
  }

  async pay(data: CardPaymentInput, userId: string) {
    const tx = await getDb().transaction("write");
    try {
      const { rows } = await tx.execute({
        sql: `SELECT cm.*, c.cutoff_day FROM card_monthly cm
              JOIN cards c ON c.id = cm.card_id AND c.user_id = cm.user_id
              WHERE cm.id = ? AND cm.user_id = ? AND c.type = 'credit'`,
        args: [data.id, userId],
      });
      const row = rows[0];
      if (!row) return { error: "not-found" } as const;
      const { cutoff_day: cutoffDay, ...fields } = row;
      const statement = normalizeStatement(fields);
      if (statement.currency !== data.currency || statement.statement_balance !== data.statement_balance) {
        return { error: "card-statement-changed" } as const;
      }

      const balance = Math.round(statement.statement_balance * 100);
      const paid = data.paid_amount === undefined ? balance : Math.round(data.paid_amount * 100);
      if (paid <= 0 || paid > balance) return { error: "invalid-payment-amount" } as const;
      const paidAmount = paid / 100;
      if (statement.is_paid) {
        if (statement.paid_amount === paidAmount && (!data.paid_at || statement.paid_at === data.paid_at)) {
          return { statement } as const;
        }
        return { error: "card-statement-changed" } as const;
      }

      if (paid < balance) {
        const method = await tx.execute({
          sql: "SELECT id FROM payment_methods WHERE card_id = ? AND user_id = ? AND type = 'card' ORDER BY seq LIMIT 1",
          args: [statement.card_id, userId],
        });
        const methodId = method.rows[0]?.id;
        if (typeof methodId !== "string") return { error: "card-payment-method-missing" } as const;
        const category = await tx.execute({
          sql: "SELECT id FROM categories WHERE name = 'card-balance' AND type = 'global' AND user_id IS NULL LIMIT 1",
        });
        const categoryId = category.rows[0]?.id;
        const nextMonth = addMonths(`${statement.month}-01`, 1).slice(0, 7);
        const date = cutoffDay == null ? `${nextMonth}-01` : cardStatementPeriod(nextMonth, Number(cutoffDay)).end;
        await insertRow<Transaction>("transactions", userId, [
          "type", "amount", "description", "category_id", "payment_method_id", "date", "currency",
        ], [
          "expense", (balance - paid) / 100, `${CARRYOVER_DESCRIPTION_PREFIX}${statement.month}`,
          typeof categoryId === "string" ? categoryId : null, methodId, date, data.currency,
        ], { db: tx });
      }

      const timestamp = now();
      const paidAt = data.paid_at ?? timestamp;
      await tx.execute({
        sql: "UPDATE card_monthly SET is_paid = 1, paid_at = ?, paid_amount = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        args: [paidAt, paidAmount, timestamp, data.id, userId],
      });
      await tx.commit();
      return { statement: { ...statement, is_paid: true, paid_at: paidAt, paid_amount: paidAmount, updated_at: timestamp } } as const;
    } finally {
      tx.close();
    }
  }

  async getHistory(userId: string, limit = 12): Promise<CardMonthly[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT cm.* FROM card_monthly cm
            INNER JOIN cards cc ON cc.id = cm.card_id AND cc.user_id = cm.user_id
            WHERE cm.user_id = ?
            ORDER BY cm.month DESC, cc.name ASC
            LIMIT ?`,
      args: [userId, limit * 20],
    });
    return result.rows.map(normalizeStatement);
  }
}

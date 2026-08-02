import { getDb } from "@/lib/db/client.ts";
import { insertRow, applyUpdate, now, type SqlValue } from "@/lib/db/utils.ts";
import type { PaymentMethod, CreatePaymentMethodInput, UpdatePaymentMethodInput } from "@/lib/types/payment-method.ts";

export class PaymentMethodRepository {
  async findAll(userId: string): Promise<PaymentMethod[]> {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE type = 'global' OR (type IN ('personal','card') AND user_id = ?) ORDER BY type = 'global' DESC, seq ASC",
      args: [userId],
    });
    return result.rows as unknown as PaymentMethod[];
  }

  async findById(id: string, userId: string): Promise<PaymentMethod | null> {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ? AND (user_id = ? OR type = 'global')",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as PaymentMethod | undefined) ?? null;
  }

  async create(data: CreatePaymentMethodInput, userId: string): Promise<PaymentMethod> {
    return insertRow<PaymentMethod>("payment_methods", userId, [
      "name", "type", "icon", "color",
    ], [
      data.name,
      data.type ?? "personal",
      data.icon || "💳", data.color ?? null,
    ]);
  }

  async createCardMethod(name: string, userId: string, cardId: string, seq: number): Promise<PaymentMethod> {
    const db = getDb();
    const id = crypto.randomUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO payment_methods (id, user_id, name, type, card_id, icon, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, "card", cardId, "💳", "#6366f1", seq, timestamp, timestamp],
    });

    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ?",
      args: [id],
    });
    return result.rows[0] as unknown as PaymentMethod;
  }

  async updateCardMethodName(cardId: string, name: string): Promise<void> {
    const db = getDb();
    await db.execute({
      sql: "UPDATE payment_methods SET name = ?, updated_at = ? WHERE card_id = ?",
      args: [name, now(), cardId],
    });
  }

  async deleteCardMethods(cardId: string): Promise<void> {
    const db = getDb();
    await db.execute({
      sql: "DELETE FROM payment_methods WHERE card_id = ?",
      args: [cardId],
    });
  }

  async update(id: string, data: UpdatePaymentMethodInput, userId: string): Promise<PaymentMethod | null> {
    const existing = await this.findById(id, userId);
    if (!existing || existing.type === "global") return null;
    if (existing.card_id) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon ?? null); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    return applyUpdate<PaymentMethod>("payment_methods", id, userId, sets, args, { existing });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.findById(id, userId);
    if (!existing) return false;
    if (existing.type === "global") return false;
    if (existing.card_id) return false;
    if (existing.user_id !== userId) return false;

    const result = await getDb().execute({
      sql: "DELETE FROM payment_methods WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

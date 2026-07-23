import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
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

  async findById(id: string): Promise<PaymentMethod | null> {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ?",
      args: [id],
    });
    return (result.rows[0] as PaymentMethod | undefined) ?? null;
  }

  async create(data: CreatePaymentMethodInput, userId: string): Promise<PaymentMethod> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("payment_methods");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO payment_methods (id, user_id, name, type, icon, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.name,
        data.type ?? "personal",
        data.icon || "💳", data.color ?? null,
        seq, now, now,
      ],
    });

    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ?",
      args: [id],
    });
    return result.rows[0] as PaymentMethod;
  }

  async createCardMethod(name: string, userId: string, cardId: string, seq: number): Promise<PaymentMethod> {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO payment_methods (id, user_id, name, type, card_id, icon, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, "card", cardId, "💳", "#6366f1", seq, now, now],
    });

    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ?",
      args: [id],
    });
    return result.rows[0] as PaymentMethod;
  }

  async updateCardMethodName(cardId: string, name: string): Promise<void> {
    const db = getDb();
    await db.execute({
      sql: "UPDATE payment_methods SET name = ?, updated_at = ? WHERE card_id = ?",
      args: [name, new Date().toISOString(), cardId],
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
    const db = getDb();
    const existing = await this.findById(id);
    if (!existing || existing.type === "global") return null;
    if (existing.card_id) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon ?? null); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE payment_methods SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ?",
      args: [id],
    });
    return result.rows[0] as PaymentMethod;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const existing = await this.findById(id);
    if (!existing) return false;
    if (existing.type === "global") return false;
    if (existing.card_id) return false;
    if (existing.user_id !== userId) return false;

    const result = await db.execute({
      sql: "DELETE FROM payment_methods WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

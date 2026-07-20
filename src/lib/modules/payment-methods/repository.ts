import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { PaymentMethod, CreatePaymentMethodInput, UpdatePaymentMethodInput } from "../../types/payment-method";

export class PaymentMethodRepository {
  async findAll(userId: string, familyId?: string): Promise<PaymentMethod[]> {
    const db = getDb();
    const conditions = ["is_global = 1 OR user_id = ?"];
    const args: any[] = [userId];

    if (familyId) {
      conditions.push("(scope IN ('family','both') AND family_id = ?)");
      args.push(familyId);
    }

    const result = await db.execute({
      sql: `SELECT * FROM payment_methods WHERE ${conditions.join(" OR ")} ORDER BY is_global DESC, seq ASC`,
      args,
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
      sql: `INSERT INTO payment_methods (id, user_id, name, scope, family_id, icon, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.name,
        data.scope ?? null, data.family_id ?? null,
        data.icon ?? null, data.color ?? null,
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
      sql: `INSERT INTO payment_methods (id, user_id, name, scope, card_id, icon, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, null, cardId, "credit-card", "#6366f1", seq, now, now],
    });

    const result = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ?",
      args: [id],
    });
    return result.rows[0] as PaymentMethod;
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
    if (!existing || (existing.is_global && existing.user_id === null)) return null;
    if (existing.card_id) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.scope !== undefined) { sets.push("scope = ?"); args.push(data.scope ?? null); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id ?? null); }
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
    if (existing.is_global) return false;
    if (existing.card_id) return false;
    if (existing.user_id !== userId) return false;

    const result = await db.execute({
      sql: "DELETE FROM payment_methods WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

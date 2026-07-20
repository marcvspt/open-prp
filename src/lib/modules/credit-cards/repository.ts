import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { CreditCard, CreditCardInput } from "../../types/credit-card";
import { PaymentMethodRepository } from "../payment-methods/repository";

const pmRepo = new PaymentMethodRepository();

function cardMethodName(type: "credit" | "debit", cardName: string): string {
  return type === "credit" ? `Crédito (${cardName})` : `Débito (${cardName})`;
}

export class CreditCardRepository {
  async findAll(userId: string): Promise<CreditCard[]> {
    const result = await getDb().execute({
      sql: "SELECT * FROM credit_cards WHERE user_id = ? ORDER BY name ASC",
      args: [userId],
    });
    return result.rows as unknown as CreditCard[];
  }

  async findById(id: string, userId: string): Promise<CreditCard | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM credit_cards WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as CreditCard | undefined) ?? null;
  }

  async create(data: CreditCardInput, userId: string): Promise<CreditCard> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("credit_cards");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO credit_cards (id, user_id, name, type, max_limit, closing_day, due_day, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.name, data.type, data.max_limit, data.closing_day, data.due_day, data.color ?? null, seq, now, now],
    });

    const pmSeq = await nextSeq("payment_methods");
    await pmRepo.createCardMethod(cardMethodName(data.type, data.name), userId, id, pmSeq);

    const result = await db.execute({ sql: "SELECT * FROM credit_cards WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as CreditCard;
  }

  async update(id: string, data: Partial<CreditCardInput>, userId: string): Promise<CreditCard | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.max_limit !== undefined) { sets.push("max_limit = ?"); args.push(data.max_limit); }
    if (data.closing_day !== undefined) { sets.push("closing_day = ?"); args.push(data.closing_day); }
    if (data.due_day !== undefined) { sets.push("due_day = ?"); args.push(data.due_day); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE credit_cards SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const newName = data.name ?? existing.name;
    const newType = data.type ?? existing.type;
    if (data.name !== undefined || data.type !== undefined) {
      await pmRepo.deleteCardMethods(id);
      const pmSeq = await nextSeq("payment_methods");
      await pmRepo.createCardMethod(cardMethodName(newType, newName), userId, id, pmSeq);
    }

    const result = await db.execute({ sql: "SELECT * FROM credit_cards WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as CreditCard;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    await pmRepo.deleteCardMethods(id);
    const result = await getDb().execute({
      sql: "DELETE FROM credit_cards WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

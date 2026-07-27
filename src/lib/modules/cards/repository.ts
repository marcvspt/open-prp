import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import type { Card, CardInput, CardType } from "@/lib/types/card.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";

const pmRepo = new PaymentMethodRepository();

function cardMethodName(type: CardType, cardName: string): string {
  if (type === "credit") return `Crédito (${cardName})`;
  if (type === "debit") return `Débito (${cardName})`;
  return `Vales (${cardName})`;
}

export class CardRepository {
  async findAll(userId: string): Promise<Card[]> {
    const result = await getDb().execute({
      sql: "SELECT * FROM cards WHERE user_id = ? ORDER BY name ASC",
      args: [userId],
    });
    return result.rows as unknown as Card[];
  }

  async findById(id: string, userId: string): Promise<Card | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM cards WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Card | undefined) ?? null;
  }

  async create(data: CardInput, userId: string): Promise<Card> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("cards");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO cards (id, user_id, name, type, max_limit, cutoff_day, payment_due_day, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.name, data.type, data.max_limit ?? null, data.cutoff_day ?? null, data.payment_due_day ?? null, data.color ?? null, seq, now, now],
    });

    const pmSeq = await nextSeq("payment_methods");
    await pmRepo.createCardMethod(cardMethodName(data.type, data.name), userId, id, pmSeq);

    const result = await db.execute({ sql: "SELECT * FROM cards WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Card;
  }

  async update(id: string, data: Partial<CardInput>, userId: string): Promise<Card | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.max_limit !== undefined) { sets.push("max_limit = ?"); args.push(data.max_limit); }
    if (data.cutoff_day !== undefined) { sets.push("cutoff_day = ?"); args.push(data.cutoff_day); }
    if (data.payment_due_day !== undefined) { sets.push("payment_due_day = ?"); args.push(data.payment_due_day); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE cards SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    if (data.name !== undefined || data.type !== undefined) {
      const newName = data.name ?? existing.name;
      const newType = data.type ?? existing.type;
      await pmRepo.updateCardMethodName(id, cardMethodName(newType, newName));
    }

    const result = await db.execute({ sql: "SELECT * FROM cards WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Card;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    await pmRepo.deleteCardMethods(id);
    const result = await getDb().execute({
      sql: "DELETE FROM cards WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

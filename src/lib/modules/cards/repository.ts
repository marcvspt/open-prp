import { getDb } from "@/lib/db/client.ts";
import { nextSeq, scopedFindById, scopedDelete, insertRow, applyUpdate, type SqlValue } from "@/lib/db/utils.ts";
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
    return scopedFindById<Card>("cards", id, userId);
  }

  async create(data: CardInput, userId: string): Promise<Card> {
    const card = await insertRow<Card>("cards", userId, [
      "name", "type", "max_limit", "cutoff_day", "payment_due_day", "color",
    ], [
      data.name, data.type, data.max_limit ?? null, data.cutoff_day ?? null, data.payment_due_day ?? null, data.color ?? null,
    ]);

    const pmSeq = await nextSeq("payment_methods");
    await pmRepo.createCardMethod(cardMethodName(data.type, data.name), userId, card.id, pmSeq);

    return card;
  }

  async update(id: string, data: Partial<CardInput>, userId: string): Promise<Card | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
    if (data.max_limit !== undefined) { sets.push("max_limit = ?"); args.push(data.max_limit); }
    if (data.cutoff_day !== undefined) { sets.push("cutoff_day = ?"); args.push(data.cutoff_day); }
    if (data.payment_due_day !== undefined) { sets.push("payment_due_day = ?"); args.push(data.payment_due_day); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    const card = await applyUpdate<Card>("cards", id, userId, sets, args, { existing });

    if (data.name !== undefined || data.type !== undefined) {
      const newName = data.name ?? existing.name;
      const newType = data.type ?? existing.type;
      await pmRepo.updateCardMethodName(id, cardMethodName(newType, newName));
    }

    return card;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    await pmRepo.deleteCardMethods(id);
    return scopedDelete("cards", id, userId);
  }
}

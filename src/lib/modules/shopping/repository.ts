import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, scopedDelete, insertRow, applyUpdate, now, type SqlValue } from "@/lib/db/utils.ts";
import type { ShoppingItem, ShoppingItemInput, ShoppingItemUpdate, ShoppingFilter } from "@/lib/types/shopping.ts";

function coerceShopping(row: ShoppingItem): ShoppingItem {
  return { ...row, is_checked: Boolean(row.is_checked), is_completed: Boolean(row.is_completed) };
}

export class ShoppingRepository {
  async findAll(userId: string, filter?: ShoppingFilter): Promise<ShoppingItem[]> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.is_checked !== undefined) { conditions.push("is_checked = ?"); args.push(filter.is_checked ? 1 : 0); }
    if (filter?.is_completed !== undefined) { conditions.push("is_completed = ?"); args.push(filter.is_completed ? 1 : 0); }
    if (filter?.category) { conditions.push("category = ?"); args.push(filter.category); }
    if (filter?.event_id) { conditions.push("event_id = ?"); args.push(filter.event_id); }

    const result = await db.execute({
      sql: `SELECT * FROM shopping_items WHERE ${conditions.join(" AND ")} ORDER BY is_checked ASC, is_completed ASC, priority DESC, seq ASC`,
      args,
    });
    return (result.rows as unknown as ShoppingItem[]).map(coerceShopping);
  }

  async findAllActive(userId: string): Promise<ShoppingItem[]> {
    return this.findAll(userId, { is_completed: false } as ShoppingFilter);
  }

  async findCompleted(userId: string): Promise<ShoppingItem[]> {
    return this.findAll(userId, { is_completed: true } as ShoppingFilter);
  }

  async findById(id: string, userId: string): Promise<ShoppingItem | null> {
    const row = await scopedFindById<ShoppingItem>("shopping_items", id, userId);
    return row ? coerceShopping(row) : null;
  }

  async create(data: ShoppingItemInput, userId: string): Promise<ShoppingItem> {
    const row = await insertRow<ShoppingItem>("shopping_items", userId, [
      "name", "quantity", "unit", "notes", "category", "despensa_item_id", "event_id", "priority",
    ], [
      data.name, data.quantity ?? 1,
      data.unit ?? null, data.notes ?? null, data.category ?? null,
      data.despensa_item_id || null, data.event_id || null,
      data.priority ?? 0,
    ]);
    return coerceShopping(row);
  }

  async update(id: string, data: ShoppingItemUpdate, userId: string): Promise<ShoppingItem | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.quantity !== undefined) { sets.push("quantity = ?"); args.push(data.quantity); }
    if (data.unit !== undefined) { sets.push("unit = ?"); args.push(data.unit); }
    if (data.notes !== undefined) { sets.push("notes = ?"); args.push(data.notes); }
    if (data.is_checked !== undefined) { sets.push("is_checked = ?"); args.push(data.is_checked ? 1 : 0); }
    if (data.is_completed !== undefined) { sets.push("is_completed = ?"); args.push(data.is_completed ? 1 : 0); }
    if (data.category !== undefined) { sets.push("category = ?"); args.push(data.category); }
    if (data.event_id !== undefined) { sets.push("event_id = ?"); args.push(data.event_id); }
    if (data.priority !== undefined) { sets.push("priority = ?"); args.push(data.priority); }

    await applyUpdate<ShoppingItem>("shopping_items", id, userId, sets, args, { existing });

    return this.findById(id, userId);
  }

  async toggleCheck(id: string, userId: string): Promise<ShoppingItem | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    await db.execute({
      sql: "UPDATE shopping_items SET is_checked = CASE WHEN is_checked THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?",
      args: [now(), id],
    });

    return this.findById(id, userId);
  }

  async completeAllChecked(userId: string): Promise<number> {
    const result = await getDb().execute({
      sql: `UPDATE shopping_items SET is_completed = 1, completed_at = ? WHERE user_id = ? AND is_checked = 1 AND is_completed = 0`,
      args: [now(), userId],
    });
    return result.rowsAffected;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return scopedDelete("shopping_items", id, userId);
  }
}

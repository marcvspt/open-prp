import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, insertRow, applyUpdate, now, type SqlValue } from "@/lib/db/utils.ts";
import type { ShoppingList, ShoppingListInput, ShoppingListUpdate } from "@/lib/types/shopping.ts";

function coerceShoppingList(row: ShoppingList): ShoppingList {
  return { ...row, is_completed: Boolean(row.is_completed) };
}

export class ShoppingListRepository {
  async findAll(userId: string): Promise<ShoppingList[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM shopping_lists WHERE user_id = ? ORDER BY is_completed ASC, created_at DESC, seq ASC`,
      args: [userId],
    });
    return (result.rows as unknown as ShoppingList[]).map(coerceShoppingList);
  }

  async findById(id: string, userId: string): Promise<ShoppingList | null> {
    const row = await scopedFindById<ShoppingList>("shopping_lists", id, userId);
    return row ? coerceShoppingList(row) : null;
  }

  async create(data: ShoppingListInput, userId: string): Promise<ShoppingList> {
    const row = await insertRow<ShoppingList>("shopping_lists", userId, [
      "name",
    ], [
      data.name?.trim() || null,
    ]);
    return coerceShoppingList(row);
  }

  async update(id: string, data: ShoppingListUpdate, userId: string): Promise<ShoppingList | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];
    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name.trim() || null); }

    await applyUpdate<ShoppingList>("shopping_lists", id, userId, sets, args, { existing });
    return this.findById(id, userId);
  }

  async complete(id: string, userId: string): Promise<ShoppingList | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const ts = now();
    await db.execute({
      sql: "UPDATE shopping_items SET is_completed = 1, completed_at = ?, updated_at = ? WHERE user_id = ? AND list_id = ?",
      args: [ts, ts, userId, id],
    });
    await db.execute({
      sql: "UPDATE shopping_lists SET is_completed = 1, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      args: [ts, ts, id, userId],
    });
    return this.findById(id, userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return false;

    await db.execute({ sql: "DELETE FROM shopping_items WHERE user_id = ? AND list_id = ?", args: [userId, id] });
    await db.execute({ sql: "DELETE FROM shopping_lists WHERE id = ? AND user_id = ?", args: [id, userId] });
    return true;
  }
}

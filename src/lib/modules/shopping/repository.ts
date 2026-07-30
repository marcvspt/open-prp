import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import { localISOString } from "@/lib/date.ts";
import type { ShoppingItem, ShoppingItemInput, ShoppingItemUpdate, ShoppingFilter } from "@/lib/types/shopping.ts";

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
    return (result.rows as unknown as ShoppingItem[]).map(r => ({
      ...r, is_checked: Boolean(r.is_checked), is_completed: Boolean(r.is_completed),
    }));
  }

  async findAllActive(userId: string): Promise<ShoppingItem[]> {
    return this.findAll(userId, { is_completed: false } as ShoppingFilter);
  }

  async findCompleted(userId: string): Promise<ShoppingItem[]> {
    return this.findAll(userId, { is_completed: true } as ShoppingFilter);
  }

  async findById(id: string, userId: string): Promise<ShoppingItem | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM shopping_items WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    const row = result.rows[0] as unknown as ShoppingItem | undefined;
    if (!row) return null;
    return { ...row, is_checked: Boolean(row.is_checked), is_completed: Boolean(row.is_completed) };
  }

  async create(data: ShoppingItemInput, userId: string): Promise<ShoppingItem> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("shopping_items");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO shopping_items (id, user_id, name, quantity, unit, notes, category, despensa_item_id, event_id, priority, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.name, data.quantity ?? 1,
        data.unit ?? null, data.notes ?? null, data.category ?? null,
        data.despensa_item_id || null, data.event_id || null,
        data.priority ?? 0, seq, now, now,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM shopping_items WHERE id = ?", args: [id] });
    const row = result.rows[0] as unknown as ShoppingItem;
    return { ...row, is_checked: Boolean(row.is_checked), is_completed: Boolean(row.is_completed) };
  }

  async update(id: string, data: ShoppingItemUpdate, userId: string): Promise<ShoppingItem | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.quantity !== undefined) { sets.push("quantity = ?"); args.push(data.quantity); }
    if (data.unit !== undefined) { sets.push("unit = ?"); args.push(data.unit); }
    if (data.notes !== undefined) { sets.push("notes = ?"); args.push(data.notes); }
    if (data.is_checked !== undefined) { sets.push("is_checked = ?"); args.push(data.is_checked ? 1 : 0); }
    if (data.is_completed !== undefined) { sets.push("is_completed = ?"); args.push(data.is_completed ? 1 : 0); }
    if (data.category !== undefined) { sets.push("category = ?"); args.push(data.category); }
    if (data.event_id !== undefined) { sets.push("event_id = ?"); args.push(data.event_id); }
    if (data.priority !== undefined) { sets.push("priority = ?"); args.push(data.priority); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(localISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE shopping_items SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    return this.findById(id, userId);
  }

  async toggleCheck(id: string, userId: string): Promise<ShoppingItem | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    await db.execute({
      sql: "UPDATE shopping_items SET is_checked = CASE WHEN is_checked THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?",
      args: [localISOString(), id],
    });

    return this.findById(id, userId);
  }

  async completeAllChecked(userId: string): Promise<number> {
    const now = localISOString();
    const result = await getDb().execute({
      sql: `UPDATE shopping_items SET is_completed = 1, completed_at = ? WHERE user_id = ? AND is_checked = 1 AND is_completed = 0`,
      args: [now, userId],
    });
    return result.rowsAffected;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM shopping_items WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

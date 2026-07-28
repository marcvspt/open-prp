import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import { localISOString } from "@/lib/date.ts";
import type { PantryItem, PantryItemInput, PantryItemUpdate, PantryFilter } from "@/lib/types/pantry.ts";

export class PantryRepository {
  async findAll(userId: string, filter?: PantryFilter): Promise<PantryItem[]> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.category_id) { conditions.push("category_id = ?"); args.push(filter.category_id); }
    if (filter?.q) { conditions.push("(description LIKE ? OR notes LIKE ?)"); args.push(`%${filter.q}%`, `%${filter.q}%`); }

    const result = await db.execute({
      sql: `SELECT * FROM pantry_items WHERE ${conditions.join(" AND ")} ORDER BY description ASC`,
      args,
    });
    return result.rows as unknown as PantryItem[];
  }

  async findById(id: string, userId: string): Promise<PantryItem | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM pantry_items WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as PantryItem | undefined) ?? null;
  }

  async create(data: PantryItemInput, userId: string): Promise<PantryItem> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("pantry_items");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO pantry_items (id, user_id, category_id, description, quantity, notes, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.category_id || null,
        data.description, data.quantity ?? 1,
        data.notes ?? null, seq, now, now,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM pantry_items WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as PantryItem;
  }

  async update(id: string, data: PantryItemUpdate, userId: string): Promise<PantryItem | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.quantity !== undefined) { sets.push("quantity = ?"); args.push(data.quantity); }
    if (data.notes !== undefined) { sets.push("notes = ?"); args.push(data.notes); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(localISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE pantry_items SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM pantry_items WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as PantryItem;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM pantry_items WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

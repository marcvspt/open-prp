import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import { localISOString } from "../../date";
import type { PantryItem, PantryItemInput, PantryItemUpdate, PantryFilter } from "../../types/pantry";

export class PantryRepository {
  async findAll(userId: string, filter?: PantryFilter): Promise<PantryItem[]> {
    const db = getDb();
    const conditions: string[] = [];
    const args: any[] = [];
    const scope = filter?.scope ?? "personal";

    if (scope === "personal") {
      conditions.push("user_id = ? AND family_id IS NULL");
      args.push(userId);
    } else if (scope === "family" && filter?.family_id) {
      conditions.push("family_id = ?");
      args.push(filter.family_id);
    } else if (scope === "all") {
      conditions.push("(user_id = ? OR family_id IN (SELECT family_id FROM family_members WHERE user_id = ?))");
      args.push(userId, userId);
    } else {
      conditions.push("user_id = ? AND family_id IS NULL");
      args.push(userId);
    }

    if (filter?.category_id) { conditions.push("category_id = ?"); args.push(filter.category_id); }

    const result = await db.execute({
      sql: `SELECT * FROM pantry_items WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      args,
    });
    return result.rows as unknown as PantryItem[];
  }

  async findById(id: string, userId: string): Promise<PantryItem | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM pantry_items WHERE id = ? AND (user_id = ? OR family_id IN (SELECT family_id FROM family_members WHERE user_id = ?))",
      args: [id, userId, userId],
    });
    return (result.rows[0] as unknown as PantryItem | undefined) ?? null;
  }

  async create(data: PantryItemInput, userId: string): Promise<PantryItem> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("pantry_items");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO pantry_items (id, user_id, family_id, category_id, name, default_quantity, unit, notes, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.family_id ?? null, data.category_id ?? null,
        data.name, data.default_quantity ?? 1, data.unit ?? null,
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
    const args: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.default_quantity !== undefined) { sets.push("default_quantity = ?"); args.push(data.default_quantity); }
    if (data.unit !== undefined) { sets.push("unit = ?"); args.push(data.unit); }
    if (data.notes !== undefined) { sets.push("notes = ?"); args.push(data.notes); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id); }

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

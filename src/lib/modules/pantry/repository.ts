import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, scopedDelete, insertRow, applyUpdate, type SqlValue } from "@/lib/db/utils.ts";
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
    return scopedFindById<PantryItem>("pantry_items", id, userId);
  }

  async create(data: PantryItemInput, userId: string): Promise<PantryItem> {
    return insertRow<PantryItem>("pantry_items", userId, [
      "category_id", "description", "quantity", "notes",
    ], [
      data.category_id || null,
      data.description, data.quantity ?? 1,
      data.notes ?? null,
    ]);
  }

  async update(id: string, data: PantryItemUpdate, userId: string): Promise<PantryItem | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.quantity !== undefined) { sets.push("quantity = ?"); args.push(data.quantity); }
    if (data.notes !== undefined) { sets.push("notes = ?"); args.push(data.notes); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id); }

    return applyUpdate<PantryItem>("pantry_items", id, userId, sets, args, { existing });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return scopedDelete("pantry_items", id, userId);
  }
}

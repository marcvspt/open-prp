import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { PantryCategory, PantryCategoryInput } from "../../types/pantry";

export class PantryCategoryRepository {
  async findAll(userId: string, familyId?: string): Promise<PantryCategory[]> {
    const db = getDb();
    const conditions = ["user_id = ?"];
    const args: any[] = [userId];

    if (familyId) {
      conditions.push("(family_id IS NULL OR family_id = ?)");
      args.push(familyId);
    } else {
      conditions.push("family_id IS NULL");
    }

    const result = await db.execute({
      sql: `SELECT * FROM pantry_categories WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      args,
    });
    return result.rows as unknown as PantryCategory[];
  }

  async create(data: PantryCategoryInput, userId: string): Promise<PantryCategory> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("pantry_categories");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO pantry_categories (id, user_id, family_id, name, icon, color, seq, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.family_id ?? null, data.name, data.icon ?? null, data.color ?? null, seq, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM pantry_categories WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as PantryCategory;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const existing = await db.execute({
      sql: "SELECT * FROM pantry_categories WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    if (!existing.rows[0]) return false;

    await db.execute({
      sql: "DELETE FROM pantry_categories WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return true;
  }
}

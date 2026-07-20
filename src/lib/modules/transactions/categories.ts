import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "../../types/category";

export class CategoryRepository {
  async findAll(userId: string, type?: "income" | "expense", familyId?: string): Promise<Category[]> {
    const db = getDb();
    const conditions = ["user_id = ?"];
    const args: any[] = [userId];

    if (type) { conditions.push("type = ?"); args.push(type); }

    if (familyId) {
      conditions.push("(family_id IS NULL OR family_id = ?)");
      args.push(familyId);
    } else {
      conditions.push("family_id IS NULL");
    }

    const result = await db.execute({
      sql: `SELECT * FROM categories WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      args,
    });
    return result.rows as unknown as Category[];
  }

  async findById(id: string, userId: string): Promise<Category | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM categories WHERE id = ? AND (user_id = ? OR family_id IN (SELECT family_id FROM family_members WHERE user_id = ?))",
      args: [id, userId, userId],
    });
    return (result.rows[0] as unknown as Category | undefined) ?? null;
  }

  async create(data: CreateCategoryInput, userId: string): Promise<Category> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("categories");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO categories (id, user_id, family_id, name, type, icon, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.family_id ?? null, data.name, data.type, data.icon ?? null, data.color ?? null, seq, now, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM categories WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Category;
  }

  async update(id: string, data: UpdateCategoryInput, userId: string): Promise<Category | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    if (existing.family_id) {
      const role = await this.getUserRole(existing.family_id, userId);
      if (!role || role === "viewer") return null;
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE categories SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM categories WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Category;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return false;

    if (existing.family_id) {
      const role = await this.getUserRole(existing.family_id, userId);
      if (!role || role === "viewer") return false;
    }

    const result = await db.execute({
      sql: "DELETE FROM categories WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }

  private async getUserRole(familyId: string, userId: string): Promise<string | null> {
    const result = await getDb().execute({
      sql: "SELECT role FROM family_members WHERE family_id = ? AND user_id = ?",
      args: [familyId, userId],
    });
    return (result.rows[0]?.role as string) ?? null;
  }
}

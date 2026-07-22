import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import { localISOString } from "@/lib/date.ts";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/lib/types/category.ts";

export class CategoryRepository {
  async findAll(userId: string): Promise<Category[]> {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM categories WHERE type = 'global' OR (type = 'personal' AND user_id = ?) ORDER BY name ASC",
      args: [userId],
    });
    return result.rows as unknown as Category[];
  }

  async findBySections(userId: string, sections: string[]): Promise<Category[]> {
    const db = getDb();
    const conditions: string[] = ["(type = 'global' OR (type = 'personal' AND user_id = ?))"];
    const args: (string | number | boolean | null)[] = [userId];

    const orParts = sections.map(s => {
      args.push(`%"${s}"%`);
      return "sections LIKE ?";
    });
    conditions.push(`(${orParts.join(" OR ")})`);

    const result = await db.execute({
      sql: `SELECT * FROM categories WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      args,
    });
    return result.rows as unknown as Category[];
  }

  async findById(id: string, userId: string): Promise<Category | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM categories WHERE id = ? AND (type = 'global' OR (type = 'personal' AND user_id = ?))",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Category | undefined) ?? null;
  }

  async findByName(name: string, userId: string): Promise<Category | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM categories WHERE (type = 'global' OR (type = 'personal' AND user_id = ?)) AND name = ?",
      args: [userId, name],
    });
    return (result.rows[0] as unknown as Category | undefined) ?? null;
  }

  async create(data: CreateCategoryInput, userId: string): Promise<Category> {
    const db = getDb();

    const existing = await db.execute({
      sql: "SELECT * FROM categories WHERE type = 'personal' AND user_id = ? AND name = ?",
      args: [userId, data.name],
    });

    if (existing.rows[0]) {
      const cat = existing.rows[0] as unknown as Category;
      const existingSections: string[] = JSON.parse(cat.sections);
      const newSections: string[] = JSON.parse(data.sections);
      const merged = [...new Set([...existingSections, ...newSections])];
      await db.execute({
        sql: "UPDATE categories SET sections = ?, updated_at = ? WHERE id = ?",
        args: [JSON.stringify(merged), localISOString(), cat.id],
      });
      const result = await db.execute({ sql: "SELECT * FROM categories WHERE id = ?", args: [cat.id] });
      return result.rows[0] as unknown as Category;
    }

    const id = crypto.randomUUID();
    const seq = await nextSeq("categories");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO categories (id, user_id, name, sections, type, icon, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.name, data.sections, data.type ?? "personal", data.icon || "📁", data.color ?? null, seq, now, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM categories WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Category;
  }

  async update(id: string, data: UpdateCategoryInput, userId: string): Promise<Category | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;
    if (existing.type === "global") return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color); }
    if (data.sections !== undefined) { sets.push("sections = ?"); args.push(data.sections); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(localISOString());
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
    if (existing.type === "global") return false;

    const result = await db.execute({
      sql: "DELETE FROM categories WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

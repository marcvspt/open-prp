import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, scopedDelete, insertRow, applyUpdate, now, type SqlValue } from "@/lib/db/utils.ts";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/lib/types/category.ts";

const PERSONAL_SCOPE = "(type = 'global' OR (type = 'personal' AND user_id = ?))";

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
    const conditions: string[] = [`(${PERSONAL_SCOPE})`];
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
    return scopedFindById<Category>("categories", id, userId, PERSONAL_SCOPE);
  }

  async findByName(name: string, userId: string): Promise<Category | null> {
    const result = await getDb().execute({
      sql: `SELECT * FROM categories WHERE ${PERSONAL_SCOPE} AND name = ?`,
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
        args: [JSON.stringify(merged), now(), cat.id],
      });
      const result = await db.execute({ sql: "SELECT * FROM categories WHERE id = ?", args: [cat.id] });
      return result.rows[0] as unknown as Category;
    }

    return insertRow<Category>("categories", userId, [
      "name", "sections", "type", "icon", "color",
    ], [
      data.name, data.sections, data.type ?? "personal", data.icon || "📁", data.color ?? null,
    ]);
  }

  async update(id: string, data: UpdateCategoryInput, userId: string): Promise<Category | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;
    if (existing.type === "global") return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color); }
    if (data.sections !== undefined) { sets.push("sections = ?"); args.push(data.sections); }
    if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }

    return applyUpdate<Category>("categories", id, userId, sets, args, { existing });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.findById(id, userId);
    if (!existing) return false;
    if (existing.type === "global") return false;

    return scopedDelete("categories", id, userId);
  }
}

import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { NoteTag } from "../../types/note";

export class NoteTagRepository {
  async findAll(userId: string, familyId?: string): Promise<NoteTag[]> {
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
      sql: `SELECT * FROM note_tags WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      args,
    });
    return result.rows as unknown as NoteTag[];
  }

  async findById(id: string, userId: string): Promise<NoteTag | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM note_tags WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as NoteTag | undefined) ?? null;
  }

  async create(data: { name: string; color?: string; family_id?: string }, userId: string): Promise<NoteTag> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("note_tags");
    const now = new Date().toISOString();

    await db.execute({
      sql: "INSERT INTO note_tags (id, user_id, family_id, name, color, seq, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, data.family_id ?? null, data.name, data.color ?? null, seq, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM note_tags WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as NoteTag;
  }

  async update(id: string, data: { name?: string; color?: string }, userId: string): Promise<NoteTag | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    if (sets.length === 0) return existing;

    args.push(id, userId);
    await db.execute({
      sql: `UPDATE note_tags SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM note_tags WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as NoteTag;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM note_tags WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

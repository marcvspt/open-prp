import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import type { NoteTag } from "@/lib/types/note.ts";

export class NoteTagRepository {
  async findAll(userId: string): Promise<NoteTag[]> {
    const result = await getDb().execute({
      sql: "SELECT * FROM note_tags WHERE user_id = ? ORDER BY name ASC",
      args: [userId],
    });
    return result.rows as unknown as NoteTag[];
  }

  async create(userId: string, name: string, color?: string): Promise<NoteTag> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("note_tags");
    const now = new Date().toISOString();

    await db.execute({
      sql: "INSERT INTO note_tags (id, user_id, name, color, seq, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, userId, name, color ?? null, seq, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM note_tags WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as NoteTag;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const existing = await db.execute({
      sql: "SELECT * FROM note_tags WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    if (!existing.rows[0]) return false;

    await db.execute({
      sql: "DELETE FROM note_tags WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return true;
  }
}

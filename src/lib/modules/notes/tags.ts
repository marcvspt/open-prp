import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, insertRow } from "@/lib/db/utils.ts";
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
    return insertRow<NoteTag>("note_tags", userId, ["name", "color"], [name, color ?? null], { withUpdatedAt: false });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await scopedFindById<NoteTag>("note_tags", id, userId);
    if (!existing) return false;

    await getDb().execute({
      sql: "DELETE FROM note_tags WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return true;
  }
}

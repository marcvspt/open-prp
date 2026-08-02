import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, insertRow, applyUpdate, type SqlValue } from "@/lib/db/utils.ts";
import type { Note, CreateNoteInput, UpdateNoteInput, NoteFilter } from "@/lib/types/note.ts";

export class NoteRepository {
  async findAll(userId: string, filter?: NoteFilter): Promise<Note[]> {
    const db = getDb();
    const conditions: string[] = ["n.user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.is_pinned !== undefined) {
      conditions.push("n.is_pinned = ?");
      args.push(filter.is_pinned ? 1 : 0);
    }

    if (filter?.tag_id) {
      conditions.push("n.id IN (SELECT note_id FROM notes_tags WHERE tag_id = ?)");
      args.push(filter.tag_id);
    }

    const result = await db.execute({
      sql: `SELECT n.* FROM notes n WHERE ${conditions.join(" AND ")} ORDER BY n.updated_at DESC`,
      args,
    });
    return result.rows as unknown as Note[];
  }

  async findById(id: string, userId: string): Promise<Note | null> {
    return scopedFindById<Note>("notes", id, userId);
  }

  async create(data: CreateNoteInput, userId: string): Promise<Note> {
    const db = getDb();
    const title = data.title?.trim() || new Date().toLocaleString("es");

    const note = await insertRow<Note>("notes", userId, [
      "title", "content", "is_pinned", "color",
    ], [
      title, data.content ?? null, data.is_pinned ? 1 : 0, data.color ?? null,
    ]);

    if (data.tag_ids?.length) {
      for (const tagId of data.tag_ids) {
        await db.execute({ sql: "INSERT INTO notes_tags (note_id, tag_id) VALUES (?, ?)", args: [note.id, tagId] });
      }
    }

    return note;
  }

  async update(id: string, data: UpdateNoteInput, userId: string): Promise<Note | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
    if (data.content !== undefined) { sets.push("content = ?"); args.push(data.content ?? null); }
    if (data.is_pinned !== undefined) { sets.push("is_pinned = ?"); args.push(data.is_pinned ? 1 : 0); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    await applyUpdate<Note>("notes", id, userId, sets, args, { existing });

    if (data.tag_ids !== undefined) {
      await db.execute({ sql: "DELETE FROM notes_tags WHERE note_id = ?", args: [id] });
      for (const tagId of data.tag_ids) {
        await db.execute({ sql: "INSERT INTO notes_tags (note_id, tag_id) VALUES (?, ?)", args: [id, tagId] });
      }
    }

    return (await this.findById(id, userId))!;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return false;

    await db.execute({ sql: "DELETE FROM notes_tags WHERE note_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM notes WHERE id = ? AND user_id = ?", args: [id, userId] });
    return true;
  }
}

import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { Note, CreateNoteInput, UpdateNoteInput, NoteFilter } from "../../types/note";

export class NoteRepository {
  async findAll(userId: string, filter?: NoteFilter): Promise<Note[]> {
    const db = getDb();
    const conditions: string[] = [];
    const args: any[] = [];
    const scope = filter?.scope ?? "personal";

    if (scope === "personal") {
      conditions.push("n.user_id = ? AND n.family_id IS NULL");
      args.push(userId);
    } else if (scope === "family" && filter?.family_id) {
      conditions.push("n.family_id = ?");
      args.push(filter.family_id);
    } else if (scope === "all") {
      conditions.push("(n.user_id = ? OR n.family_id = ?)");
      args.push(userId, filter?.family_id ?? "");
    } else {
      conditions.push("n.user_id = ? AND n.family_id IS NULL");
      args.push(userId);
    }

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
    const result = await getDb().execute({
      sql: "SELECT * FROM notes WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Note | undefined) ?? null;
  }

  async create(data: CreateNoteInput, userId: string): Promise<Note> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("notes");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO notes (id, user_id, family_id, title, content, is_pinned, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.family_id ?? null, data.title, data.content ?? null, data.is_pinned ? 1 : 0, data.color ?? null, seq, now, now],
    });

    if (data.tag_ids?.length) {
      for (const tagId of data.tag_ids) {
        await db.execute({ sql: "INSERT INTO notes_tags (note_id, tag_id) VALUES (?, ?)", args: [id, tagId] });
      }
    }

    const result = await db.execute({ sql: "SELECT * FROM notes WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Note;
  }

  async update(id: string, data: UpdateNoteInput, userId: string): Promise<Note | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
    if (data.content !== undefined) { sets.push("content = ?"); args.push(data.content ?? null); }
    if (data.is_pinned !== undefined) { sets.push("is_pinned = ?"); args.push(data.is_pinned ? 1 : 0); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id ?? null); }

    if (sets.length > 0) {
      sets.push("updated_at = ?");
      args.push(new Date().toISOString());
      args.push(id, userId);

      await db.execute({
        sql: `UPDATE notes SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
        args,
      });
    }

    if (data.tag_ids !== undefined) {
      await db.execute({ sql: "DELETE FROM notes_tags WHERE note_id = ?", args: [id] });
      for (const tagId of data.tag_ids) {
        await db.execute({ sql: "INSERT INTO notes_tags (note_id, tag_id) VALUES (?, ?)", args: [id, tagId] });
      }
    }

    const result = await db.execute({ sql: "SELECT * FROM notes WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Note;
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

import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { Todo, TodoInput, TodoFilter } from "../../types/todo";

export class TodoRepository {
  async findAll(userId: string, filter?: TodoFilter): Promise<Todo[]> {
    const db = getDb();
    const conditions: string[] = [];
    const args: any[] = [];
    const scope = filter?.scope ?? "personal";

    if (scope === "personal") {
      conditions.push("user_id = ? AND family_id IS NULL");
      args.push(userId);
    } else if (scope === "family" && filter?.family_id) {
      conditions.push("family_id = ?");
      args.push(filter.family_id);
    } else if (scope === "all") {
      conditions.push("(user_id = ? OR family_id = ?)");
      args.push(userId, filter?.family_id ?? "");
    } else {
      conditions.push("user_id = ? AND family_id IS NULL");
      args.push(userId);
    }

    if (filter?.is_completed !== undefined) { conditions.push("is_completed = ?"); args.push(filter.is_completed ? 1 : 0); }
    if (filter?.category) { conditions.push("category = ?"); args.push(filter.category); }
    if (filter?.event_id) { conditions.push("event_id = ?"); args.push(filter.event_id); }
    if (filter?.due_date_from) { conditions.push("due_date >= ?"); args.push(filter.due_date_from); }
    if (filter?.due_date_to) { conditions.push("due_date <= ?"); args.push(filter.due_date_to); }

    const result = await db.execute({
      sql: `SELECT * FROM todos WHERE ${conditions.join(" AND ")} ORDER BY created_at ASC`,
      args,
    });
    return result.rows as unknown as Todo[];
  }

  async findById(id: string, userId: string): Promise<Todo | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM todos WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Todo | undefined) ?? null;
  }

  async create(data: TodoInput, userId: string): Promise<Todo> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("todos");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO todos (id, user_id, family_id, title, description, priority, due_date, category, event_id, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.family_id ?? null, data.title, data.description ?? null,
        data.priority ?? 0, data.due_date ?? null, data.category ?? null,
        data.event_id ?? null, seq, now, now,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM todos WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Todo;
  }

  async update(id: string, data: Partial<TodoInput & { is_completed: boolean }>, userId: string): Promise<Todo | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description ?? null); }
    if (data.priority !== undefined) { sets.push("priority = ?"); args.push(data.priority); }
    if (data.due_date !== undefined) { sets.push("due_date = ?"); args.push(data.due_date ?? null); }
    if (data.is_completed !== undefined) { sets.push("is_completed = ?"); args.push(data.is_completed ? 1 : 0); }
    if (data.category !== undefined) { sets.push("category = ?"); args.push(data.category ?? null); }
    if (data.event_id !== undefined) { sets.push("event_id = ?"); args.push(data.event_id ?? null); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE todos SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM todos WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Todo;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM todos WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

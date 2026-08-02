import { getDb } from "@/lib/db/client.ts";
import { scopedFindById, scopedDelete, insertRow, applyUpdate, type SqlValue } from "@/lib/db/utils.ts";
import type { Task, TaskInput, TaskFilter } from "@/lib/types/task.ts";

export class TaskRepository {
  async findAll(userId: string, filter?: TaskFilter): Promise<Task[]> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.is_completed !== undefined) { conditions.push("is_completed = ?"); args.push(filter.is_completed ? 1 : 0); }
    if (filter?.category) { conditions.push("category = ?"); args.push(filter.category); }
    if (filter?.due_date_from) { conditions.push("due_date >= ?"); args.push(filter.due_date_from); }
    if (filter?.due_date_to) { conditions.push("due_date <= ?"); args.push(filter.due_date_to); }

    const result = await db.execute({
      sql: `SELECT * FROM tasks WHERE ${conditions.join(" AND ")} ORDER BY created_at ASC`,
      args,
    });
    return result.rows as unknown as Task[];
  }

  async findById(id: string, userId: string): Promise<Task | null> {
    return scopedFindById<Task>("tasks", id, userId);
  }

  async create(data: TaskInput, userId: string): Promise<Task> {
    return insertRow<Task>("tasks", userId, [
      "description", "priority", "due_date", "category",
    ], [
      data.description,
      data.priority ?? 0, data.due_date ?? null, data.category ?? null,
    ]);
  }

  async update(id: string, data: Partial<TaskInput & { is_completed: boolean }>, userId: string): Promise<Task | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.priority !== undefined) { sets.push("priority = ?"); args.push(data.priority); }
    if (data.due_date !== undefined) { sets.push("due_date = ?"); args.push(data.due_date ?? null); }
    if (data.is_completed !== undefined) { sets.push("is_completed = ?"); args.push(data.is_completed ? 1 : 0); }
    if (data.category !== undefined) { sets.push("category = ?"); args.push(data.category ?? null); }

    return applyUpdate<Task>("tasks", id, userId, sets, args, { existing });
  }

  async toggleComplete(id: string, userId: string): Promise<Task | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;
    const newStatus = existing.is_completed ? 0 : 1;
    return this.update(id, { is_completed: newStatus === 1 } as Partial<TaskInput & { is_completed: boolean }>, userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return scopedDelete("tasks", id, userId);
  }
}

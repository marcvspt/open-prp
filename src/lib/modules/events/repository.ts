import { getDb } from "@/lib/db/client.ts";
import { nextSeq } from "@/lib/db/utils.ts";
import type { Event, CreateEventInput, UpdateEventInput, EventFilter } from "@/lib/types/event.ts";
import type { PaginatedResponse } from "@/lib/types/general.ts";

export class EventRepository {
  async findAll(userId: string, filter?: EventFilter): Promise<PaginatedResponse<Event>> {
    const db = getDb();
    const conditions: string[] = ["user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.status) {
      const statuses = filter.status.split(",").map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        conditions.push("status = ?"); args.push(statuses[0]);
      } else if (statuses.length > 1) {
        conditions.push(`status IN (${statuses.map(() => "?").join(",")})`);
        args.push(...statuses);
      }
    }
    if (filter?.category_id) { conditions.push("category_id = ?"); args.push(filter.category_id); }
    if (filter?.date_from) { conditions.push("start_date >= ?"); args.push(filter.date_from); }
    if (filter?.date_to) { conditions.push("start_date <= ?"); args.push(filter.date_to); }

    const where = conditions.join(" AND ");
    const page = filter?.page ?? 1;
    const pageSize = filter?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) AS total FROM events WHERE ${where}`,
      args,
    });
    const total = Number(countResult.rows[0]?.total ?? 0);

    const dataResult = await db.execute({
      sql: `SELECT * FROM events WHERE ${where} ORDER BY start_date DESC LIMIT ? OFFSET ?`,
      args: [...args, pageSize, offset],
    });

    return { data: dataResult.rows as unknown as Event[], total, page, pageSize };
  }

  async findById(id: string, userId: string): Promise<Event | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM events WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as Event | undefined) ?? null;
  }

  async create(data: CreateEventInput, userId: string): Promise<Event> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("events");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO events (id, user_id, category_id, description, location, start_date, end_date, is_all_day, status, color, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.category_id ?? null, data.description, data.location ?? null,
        data.start_date, data.end_date ?? null,
        data.is_all_day ? 1 : 0, data.status ?? "pending", data.color ?? null,
        seq, now, now,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM events WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Event;
  }

  async update(id: string, data: UpdateEventInput, userId: string): Promise<Event | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: (string | number | boolean | null)[] = [];

    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.location !== undefined) { sets.push("location = ?"); args.push(data.location ?? null); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id ?? null); }
    if (data.start_date !== undefined) { sets.push("start_date = ?"); args.push(data.start_date); }
    if (data.end_date !== undefined) { sets.push("end_date = ?"); args.push(data.end_date ?? null); }
    if (data.is_all_day !== undefined) { sets.push("is_all_day = ?"); args.push(data.is_all_day ? 1 : 0); }
    if (data.status !== undefined) { sets.push("status = ?"); args.push(data.status); }
    if (data.color !== undefined) { sets.push("color = ?"); args.push(data.color ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE events SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM events WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Event;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM events WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }
}

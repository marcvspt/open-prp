import { getDb } from "../../db/client";
import type { User } from "../../types/user";

export class UserRepository {
  async findOrCreate(clerkId: string, email: string, name?: string): Promise<User> {
    const db = getDb();
    const existing = await db.execute({
      sql: "SELECT * FROM users WHERE clerk_id = ?",
      args: [clerkId],
    });
    if (existing.rows[0]) return existing.rows[0] as unknown as User;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute({
      sql: "INSERT INTO users (id, clerk_id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, clerkId, email, name ?? null, now, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as User;
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM users WHERE clerk_id = ?",
      args: [clerkId],
    });
    return (result.rows[0] as unknown as User | undefined) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [id],
    });
    return (result.rows[0] as unknown as User | undefined) ?? null;
  }
}

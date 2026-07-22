import { getDb } from "@/lib/db/client.ts";
import type { User } from "@/lib/types/user.ts";

const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

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

  async needsSync(clerkId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "SELECT updated_at, email, display_name FROM users WHERE clerk_id = ?",
      args: [clerkId],
    });
    if (!result.rows[0]) return true;
    const row = result.rows[0] as Record<string, string>;
    if (!row.email || !row.display_name) return true;
    const updatedAt = new Date(row.updated_at).getTime();
    return Date.now() - updatedAt > SYNC_COOLDOWN_MS;
  }

  async syncProfile(userId: string, email: string, name?: string): Promise<void> {
    const now = new Date().toISOString();
    await getDb().execute({
      sql: "UPDATE users SET email = ?, display_name = ?, updated_at = ? WHERE id = ?",
      args: [email, name ?? null, now, userId],
    });
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

import { getDb } from "./client";

export async function nextSeq(table: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM "${table}"`,
    args: [],
  });
  return Number(result.rows[0]?.next ?? 1);
}

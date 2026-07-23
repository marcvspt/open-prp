import { getDb } from "@/lib/db/client.ts";

export async function nextSeq(table: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(seq), 0) + 1 AS v FROM "${table}"`,
    args: [],
  });
  const row = result.rows[0];
  if (!row) return 1;
  const val = typeof row === "object" && !Array.isArray(row)
    ? (row as Record<string, unknown>).v
    : (row as unknown[])[0];
  return Number(val ?? 1);
}

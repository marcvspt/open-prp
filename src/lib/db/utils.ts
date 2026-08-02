import { getDb } from "@/lib/db/client.ts";
import { localISOString } from "@/lib/date.ts";

export type SqlValue = string | number | boolean | null;

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

/** Timestamp local a la app (formato ISO sin zona horaria). */
export function now(): string {
  return localISOString();
}

/**
 * `SELECT * FROM table WHERE id = ? AND <scope>` con scope por defecto `user_id = ?`.
 * Devuelve la primera fila o `null`.
 */
export async function scopedFindById<T>(
  table: string,
  id: string,
  userId: string,
  scope = "user_id = ?",
): Promise<T | null> {
  const result = await getDb().execute({
    sql: `SELECT * FROM ${table} WHERE id = ? AND ${scope}`,
    args: [id, userId],
  });
  return (result.rows[0] as T | undefined) ?? null;
}

/** `DELETE FROM table WHERE id = ? AND <scope>`; devuelve si afectó filas. */
export async function scopedDelete(
  table: string,
  id: string,
  userId: string,
  scope = "user_id = ?",
): Promise<boolean> {
  const result = await getDb().execute({
    sql: `DELETE FROM ${table} WHERE id = ? AND ${scope}`,
    args: [id, userId],
  });
  return result.rowsAffected > 0;
}

/**
 * INSERT con columnas de negocio + id/user_id/seq/created_at[/updated_at] generados.
 * Devuelve la fila recién insertada.
 */
export async function insertRow<T>(
  table: string,
  userId: string,
  columns: string[],
  values: SqlValue[],
  opts: { withSeq?: boolean; withUpdatedAt?: boolean } = {},
): Promise<T> {
  const db = getDb();
  const withSeq = opts.withSeq ?? true;
  const withUpdatedAt = opts.withUpdatedAt ?? true;
  const id = crypto.randomUUID();
  const timestamp = now();
  const seq = withSeq ? await nextSeq(table) : null;

  const colNames = ["id", "user_id", ...columns];
  const args: SqlValue[] = [id, userId, ...values];
  if (withSeq) { colNames.push("seq"); args.push(seq); }
  if (withUpdatedAt) { colNames.push("created_at", "updated_at"); args.push(timestamp, timestamp); }
  else { colNames.push("created_at"); args.push(timestamp); }

  await db.execute({
    sql: `INSERT INTO ${table} (${colNames.join(", ")}) VALUES (${colNames.map(() => "?").join(", ")})`,
    args,
  });

  const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
  return result.rows[0] as unknown as T;
}

/**
 * Ejecuta un UPDATE dinámico ya armado (`sets`/`args`) con scope por usuario y
 * re-consulta la fila actualizada. Si `sets` está vacío devuelve `opts.existing`.
 */
export async function applyUpdate<T>(
  table: string,
  id: string,
  userId: string,
  sets: string[],
  args: SqlValue[],
  opts: { withUpdatedAt?: boolean; existing?: T; where?: string } = {},
): Promise<T | null> {
  if (sets.length === 0) return opts.existing ?? null;

  const finalArgs = [...args];
  if (opts.withUpdatedAt !== false) { sets.push("updated_at = ?"); finalArgs.push(now()); }
  finalArgs.push(id, userId);

  await getDb().execute({
    sql: `UPDATE ${table} SET ${sets.join(", ")} WHERE id = ? AND ${opts.where ?? "user_id = ?"}`,
    args: finalArgs,
  });

  const result = await getDb().execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
  return (result.rows[0] as unknown as T | undefined) ?? null;
}

import { createClient } from "@libsql/client/web";

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({
      url: import.meta.env.TURSO_DB_URL,
      authToken: import.meta.env.TURSO_DB_TOKEN,
    });
  }
  return client;
}

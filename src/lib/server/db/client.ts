import { createClient } from "@libsql/client/web";
import { TURSO_DB_URL, TURSO_DB_TOKEN } from "astro:env/server";

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({
      url: TURSO_DB_URL,
      authToken: TURSO_DB_TOKEN,
    });
  }
  return client;
}

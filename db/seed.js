import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});

async function nextSeq(table) {
  const result = await client.execute(`SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM "${table}"`);
  return Number(result.rows[0]?.next ?? 1);
}

async function runSchema() {
  console.log("Running schema...");
  const schemaDir = join(__dirname, "schema");
  const files = readdirSync(schemaDir).filter(f => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = readFileSync(join(schemaDir, file), "utf-8");
    const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err) {
        console.error(`  ✗ ${file}: ${err.message}`);
      }
    }
    console.log(`  ✓ ${file}`);
  }
  console.log("Schema complete!\n");
}

async function seed() {
  console.log("Seeding database...");

  const now = new Date().toISOString();

  // ── Payment Methods (global) ──
  const paymentMethods = [
    { name: "Nómina", icon: "briefcase", color: "#22c55e" },
    { name: "Transferencia", icon: "arrow-left-right", color: "#3b82f6" },
    { name: "Retiro de efectivo", icon: "banknote", color: "#ef4444" },
  ];
  for (const pm of paymentMethods) {
    await client.execute({
      sql: "INSERT INTO payment_methods (id, user_id, name, is_global, icon, color, seq, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), null, pm.name, pm.icon, pm.color, await nextSeq("payment_methods"), now, now],
    });
  }
  console.log(`  ✓ ${paymentMethods.length} global payment methods created`);

  console.log("\nSeed complete!");
  client.close();
}

async function main() {
  await runSchema();
  await seed();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

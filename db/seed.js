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

async function runSchemas() {
  console.log("Running Schemas...");
  const schemasDir = join(__dirname, "schemas");
  const files = readdirSync(schemasDir).filter(f => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = readFileSync(join(schemasDir, file), "utf-8");
    const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch {
        console.error("  ✗ failed to apply schema statement");
      }
    }
    console.log("  ✓ schema applied");
  }
  console.log("Schemas complete!\n");
}

async function seed() {
  console.log("Seeding database...");

  const now = new Date().toISOString();

  // ── Payment Methods (global) ──
  const paymentMethods = [
    { name: "payroll", icon: "💰", color: "#f59e0b" },
    { name: "transfer", icon: "🔄", color: "#3b82f6" },
    { name: "cash", icon: "💵", color: "#22c55e" },
  ];
  for (const pm of paymentMethods) {
    await client.execute({
      sql: "INSERT INTO payment_methods (id, user_id, name, type, icon, color, seq, created_at, updated_at) VALUES (?, ?, ?, 'global', ?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), null, pm.name, pm.icon, pm.color, await nextSeq("payment_methods"), now, now],
    });
  }
  console.log("  ✓ global payment methods created");

  // ── Categories (unified) ──
  const categories = [
    // Pantry
    { name: "cleaning", sections: ["pantry"], icon: "🧹", color: "#8b5cf6" },
    { name: "food", sections: ["pantry"], icon: "🍽️", color: "#f97316" },
    { name: "candy", sections: ["pantry"], icon: "🍬", color: "#ec4899" },
    { name: "school", sections: ["pantry", "events", "transactions", "installments", "recurring-payments"], icon: "📚", color: "#3b82f6" },
    { name: "hygiene", sections: ["pantry"], icon: "🧴", color: "#06b6d4" },
    { name: "drinks", sections: ["pantry"], icon: "🥤", color: "#0ea5e9" },
    { name: "automotive", sections: ["pantry", "transactions", "installments", "recurring-payments"], icon: "🚗", color: "#64748b" },
    // Tasks
    { name: "personal", sections: ["tasks", "events"], icon: "👤", color: "#6366f1" },
    { name: "errand", sections: ["tasks"], icon: "📋", color: "#f59e0b" },
    { name: "work", sections: ["tasks", "events"], icon: "💼", color: "#3b82f6" },
    // Transactions
    { name: "supermarket", sections: ["transactions"], icon: "🛒", color: "#f97316" },
    { name: "transport", sections: ["transactions"], icon: "🚌", color: "#3b82f6" },
    { name: "health", sections: ["transactions", "events", "installments"], icon: "🏥", color: "#ef4444" },
    { name: "leisure", sections: ["transactions"], icon: "🎮", color: "#8b5cf6" },
    { name: "housing", sections: ["transactions", "installments", "recurring-payments"], icon: "🏠", color: "#22c55e" },
    { name: "salary", sections: ["transactions", "recurring-payments"], icon: "💰", color: "#22c55e" },
    { name: "freelance", sections: ["transactions", "recurring-payments"], icon: "💻", color: "#6366f1" },
    // Installments
    { name: "electronics", sections: ["installments", "transactions"], icon: "📱", color: "#3b82f6" },
    { name: "furniture", sections: ["installments", "transactions", "recurring-payments"], icon: "🪑", color: "#f97316" },
    { name: "card-balance", sections: ["installments", "transactions"], icon: "💳", color: "#ef4444" },
    // Recurring payments
    { name: "subscriptions", sections: ["recurring-payments", "transactions", "installments"], icon: "📺", color: "#ec4899" },
    {
      name: "bills", sections: ["recurring-payments", "transactions",
        "installments"], icon: "📄", color: "#ef4444"
    },
    { name: "insurance", sections: ["recurring-payments", "transactions", "installments"], icon: "🛡️", color: "#22c55e" },
    // Events
    { name: "social", sections: ["events"], icon: "🎉", color: "#ec4899" },
    { name: "family", sections: ["events"], icon: "👨‍👩‍👧‍👦", color: "#22c55e" },
    { name: "entertainment", sections: ["events", "transactions", "installments", "recurring-payments"], icon: "🎮", color: "#8b5cf6" },
    { name: "other", sections: ["events", "transactions", "installments", "recurring-payments"], icon: "📌", color: "#6b7280" },
  ];
  for (const cat of categories) {
    await client.execute({
      sql: "INSERT INTO categories (id, user_id, name, sections, type, icon, color, seq, created_at, updated_at) VALUES (?, ?, ?, ?, 'global', ?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), null, cat.name, JSON.stringify(cat.sections), cat.icon, cat.color, await nextSeq("categories"), now, now],
    });
  }
  console.log("  ✓ categories created");

  console.log("\nSeed complete!");
  client.close();
}

async function main() {
  await runSchemas();
  await seed();
}

main().catch(() => {
  console.error("Seed failed");
  process.exit(1);
});

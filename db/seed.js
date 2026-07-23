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
    { name: "Nómina", icon: "💰", color: "#22c55e" },
    { name: "Transferencia", icon: "🔄", color: "#3b82f6" },
    { name: "Retiro de efectivo", icon: "💵", color: "#ef4444" },
  ];
  for (const pm of paymentMethods) {
    await client.execute({
      sql: "INSERT INTO payment_methods (id, user_id, name, type, icon, color, seq, created_at, updated_at) VALUES (?, ?, ?, 'global', ?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), null, pm.name, pm.icon, pm.color, await nextSeq("payment_methods"), now, now],
    });
  }
  console.log(`  ✓ ${paymentMethods.length} global payment methods created`);

  // ── Categories (unified) ──
  const categories = [
    // Despensa
    { name: "Limpieza", sections: ["despensa"], icon: "🧹", color: "#8b5cf6" },
    { name: "Comida", sections: ["despensa"], icon: "🍽️", color: "#f97316" },
    { name: "Golosinas", sections: ["despensa"], icon: "🍬", color: "#ec4899" },
    { name: "Varios", sections: ["despensa"], icon: "📦", color: "#6b7280" },
    { name: "Escuela", sections: ["despensa", "eventos"], icon: "📚", color: "#3b82f6" },
    { name: "Higiene", sections: ["despensa"], icon: "🧴", color: "#06b6d4" },
    { name: "Bebidas", sections: ["despensa"], icon: "🥤", color: "#0ea5e9" },
    { name: "Automotriz", sections: ["despensa"], icon: "🚗", color: "#64748b" },
    // Tareas
    { name: "Personal", sections: ["tareas", "eventos"], icon: "👤", color: "#6366f1" },
    { name: "Encargo", sections: ["tareas"], icon: "📋", color: "#f59e0b" },
    { name: "Trabajo", sections: ["tareas", "eventos"], icon: "💼", color: "#3b82f6" },
    // Transacciones
    { name: "Supermercado", sections: ["transacciones"], icon: "🛒", color: "#f97316" },
    { name: "Transporte", sections: ["transacciones"], icon: "🚌", color: "#3b82f6" },
    { name: "Salud", sections: ["transacciones", "eventos"], icon: "🏥", color: "#ef4444" },
    { name: "Ocio", sections: ["transacciones"], icon: "🎮", color: "#8b5cf6" },
    { name: "Vivienda", sections: ["transacciones"], icon: "🏠", color: "#22c55e" },
    { name: "Salario", sections: ["transacciones"], icon: "💰", color: "#22c55e" },
    { name: "Freelance", sections: ["transacciones"], icon: "💻", color: "#6366f1" },
    // Plazos
    { name: "Electrónica", sections: ["plazos"], icon: "📱", color: "#3b82f6" },
    { name: "Muebles", sections: ["plazos"], icon: "🪑", color: "#f97316" },
    { name: "Educación", sections: ["plazos"], icon: "🎓", color: "#8b5cf6" },
    { name: "Saldo de tarjeta", sections: ["plazos"], icon: "💳", color: "#ef4444" },
    // Pagos recurrentes
    { name: "Suscripciones", sections: ["pagos-recurrentes"], icon: "📺", color: "#ec4899" },
    { name: "Facturas", sections: ["pagos-recurrentes"], icon: "📄", color: "#ef4444" },
    { name: "Seguros", sections: ["pagos-recurrentes"], icon: "🛡️", color: "#22c55e" },
    // Eventos
    { name: "Social", sections: ["eventos"], icon: "🎉", color: "#ec4899" },
    { name: "Familiar", sections: ["eventos"], icon: "👨‍👩‍👧‍👦", color: "#22c55e" },
    { name: "Entretenimiento", sections: ["eventos"], icon: "🎮", color: "#8b5cf6" },
    { name: "Otro", sections: ["eventos"], icon: "📌", color: "#6b7280" },
  ];
  for (const cat of categories) {
    await client.execute({
      sql: "INSERT INTO categories (id, user_id, name, sections, type, icon, color, seq, created_at, updated_at) VALUES (?, ?, ?, ?, 'global', ?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), null, cat.name, JSON.stringify(cat.sections), cat.icon, cat.color, await nextSeq("categories"), now, now],
    });
  }
  console.log(`  ✓ ${categories.length} categories created`);

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

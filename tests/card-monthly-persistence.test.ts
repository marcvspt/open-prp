import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { createClient } from "@libsql/client";

const dbSymbol = Symbol.for("open-prp.test.card-monthly-db");
const stub = "data:text/javascript,export const getDb = () => globalThis[Symbol.for('open-prp.test.card-monthly-db')]";
const hook = registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === "@/lib/server/db/client.ts" ? stub : specifier, context);
  },
});
const { CardMonthlyRepository } = await import("@/lib/modules/card-monthly/repository.ts");
hook.deregister();

test("Los estados solo se escriben para su cuenta y el pago parcial guarda ambos movimientos", async context => {
  const db = createClient({ url: ":memory:" });
  Reflect.set(globalThis, dbSymbol, db);
  context.after(() => {
    Reflect.deleteProperty(globalThis, dbSymbol);
    db.close();
  });

  for (const file of [
    "01-users.sql", "02-cards.sql", "03-categories.sql", "13-payment-methods.sql",
    "05-transactions.sql", "14-card-monthly.sql",
  ]) {
    await db.executeMultiple(await readFile(new URL(`../db/schemas/${file}`, import.meta.url), "utf8"));
  }
  await db.executeMultiple(`
    INSERT INTO users (id, clerk_id) VALUES ('alice', 'local-a'), ('bob', 'local-b');
    INSERT INTO cards (id, user_id, name, type, cutoff_day) VALUES ('card-a', 'alice', 'A', 'credit', 31);
    INSERT INTO payment_methods (id, user_id, name, type, card_id) VALUES ('method-a', 'alice', 'A', 'card', 'card-a');
    INSERT INTO categories (id, name, type) VALUES ('carryover', 'card-balance', 'global');
  `);

  const repo = new CardMonthlyRepository();
  const snapshot = { card_id: "card-a", month: "2026-01", statement_balance: 500, currency: "EUR" };
  assert.equal(await repo.upsert(snapshot, "alice"), true);
  assert.equal(await repo.upsert({ ...snapshot, statement_balance: 1 }, "bob"), false);
  assert.deepEqual(await repo.getHistory("bob"), []);

  const [open] = await repo.findByMonth("2026-01", "alice");
  assert.equal(open.statement_balance, 500);
  const payment = { id: open.id, statement_balance: 500, currency: "EUR", paid_amount: 150, paid_at: "2026-02-01" };
  assert.deepEqual(await repo.pay(payment, "bob"), { error: "not-found" });

  await db.execute(`
    CREATE TRIGGER test_rollback BEFORE UPDATE OF is_paid ON card_monthly
    BEGIN SELECT RAISE(ABORT, 'test rollback'); END
  `);
  await assert.rejects(repo.pay(payment, "alice"));
  assert.equal((await repo.findByMonth("2026-01", "alice"))[0].is_paid, false);
  assert.equal((await db.execute("SELECT id FROM transactions")).rows.length, 0);
  await db.execute("DROP TRIGGER test_rollback");

  const first = await repo.pay(payment, "alice");
  assert.equal(first.statement?.paid_amount, 150);
  assert.deepEqual(await repo.pay(payment, "alice"), first);
  const { rows } = await db.execute("SELECT amount, currency, date, payment_method_id FROM transactions");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 350);
  assert.equal(rows[0].currency, "EUR");
  assert.equal(rows[0].date, "2026-02-28");
  assert.equal(rows[0].payment_method_id, "method-a");

  assert.equal(await repo.upsert({ ...snapshot, statement_balance: 800 }, "alice"), true);
  assert.equal((await repo.findByMonth("2026-01", "alice"))[0].statement_balance, 500);
});

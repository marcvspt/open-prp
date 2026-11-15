import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeDashboardBalances } from "@/lib/dashboard/balance.ts";

test("Resumen separa los movimientos y el remanente por moneda", () => {
  const inputs = {
    transactions: [
      { type: "income", amount: 500, currency: "MXN" },
      { type: "expense", amount: 40, currency: "USD" },
    ],
    cashback: [{ amount: 10, currency: "USD" }],
    installments: [{ monthly_amount: 100, currency: "MXN" }],
    recurring: [{ type: "expense", amount: 25, currency: "MXN" }],
    cardDebts: [{
      card_id: "credit", is_paid: true, paid_at: "2026-11-13",
      statement_balance: 40, paid_amount: 30, currency: "USD", mixedCurrency: false,
    }],
  } satisfies Parameters<typeof summarizeDashboardBalances>[0];

  assert.deepEqual(summarizeDashboardBalances(inputs), {
    balances: [
      { currency: "MXN", income: 500, expense: 125, installments: 100, recurringExpenses: 25 },
      { currency: "USD", income: 10, expense: 30, installments: 0, recurringExpenses: 0 },
    ],
    hasUnassignedCarryover: false,
  });

  const historic = summarizeDashboardBalances({
    ...inputs,
    cardDebts: inputs.cardDebts.map(statement => ({ ...statement, currency: null })),
  });
  assert.equal(historic.hasUnassignedCarryover, true);
  assert.equal(historic.balances.find(group => group.currency === "USD")?.expense, 40);
});

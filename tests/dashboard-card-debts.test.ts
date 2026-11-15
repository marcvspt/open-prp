import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeDashboardCardDebts } from "@/lib/dashboard/card-debts.ts";

const sources = {
  cards: [{ id: "credit", type: "credit" }, { id: "debit", type: "debit" }] as const,
  paymentMethodCards: new Map([["credit-method", "credit"], ["debit-method", "debit"]]),
  statements: [],
  installments: [],
  recurring: [],
  cashback: [],
  expenses: [],
};

const storedStatement = {
  card_id: "credit", statement_balance: 400, paid_amount: 0, is_paid: false, paid_at: null, currency: "MXN",
};

test("Resumen muestra el saldo de una tarjeta con movimientos aunque todavía no tenga un estado guardado", () => {
  const result = summarizeDashboardCardDebts({
    ...sources,
    expenses: [{ payment_method_id: "credit-method", amount: 450, currency: "MXN" }, { payment_method_id: "debit-method", amount: 300, currency: "USD" }],
    installments: [{ payment_method_id: "credit-method", monthly_amount: 100, currency: "MXN" }],
    recurring: [
      { payment_method_id: "credit-method", amount: 60, type: "expense", is_paid: true, currency: "MXN" },
      { payment_method_id: "credit-method", amount: 70, type: "expense", is_paid: false, currency: "USD" },
      { payment_method_id: "credit-method", amount: 80, type: "income", is_paid: true, currency: "EUR" },
    ],
    cashback: [{ card_id: "credit", amount: 10, currency: "MXN" }],
  });

  assert.deepEqual(result, [{ ...storedStatement, statement_balance: 600, mixedCurrency: false }]);
});

test("Resumen reemplaza un saldo abierto guardado con los movimientos actuales, incluso tras borrarlos", () => {
  const input = { ...sources, statements: [storedStatement] };

  assert.deepEqual(summarizeDashboardCardDebts({
    ...input,
    expenses: [{ payment_method_id: "credit-method", amount: 250, currency: "MXN" }],
  }), [{ ...storedStatement, statement_balance: 250, mixedCurrency: false }]);
  assert.deepEqual(summarizeDashboardCardDebts(input), [{ ...storedStatement, currency: null, statement_balance: 0, mixedCurrency: false }]);
});

test("Resumen conserva el importe y el estado de un pago parcial ya registrado", () => {
  const paid = { ...storedStatement, paid_amount: 300, is_paid: true, paid_at: "2026-11-10" };
  const result = summarizeDashboardCardDebts({
    ...sources,
    statements: [paid],
    expenses: [{ payment_method_id: "credit-method", amount: 250, currency: "USD" }],
  });

  assert.deepEqual(result, [{ ...paid, mixedCurrency: false }]);
});

test("Resumen señala un corte con varias monedas sin publicar un saldo combinado", () => {
  const result = summarizeDashboardCardDebts({
    ...sources,
    expenses: [
      { payment_method_id: "credit-method", amount: 250, currency: "MXN" },
      { payment_method_id: "credit-method", amount: 100, currency: "USD" },
    ],
  });

  assert.deepEqual(result, [{ ...storedStatement, currency: null, statement_balance: 0, mixedCurrency: true }]);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeMonthlyActivity } from "@/lib/dashboard/monthly-activity.ts";
import { cardStatementPeriod } from "@/lib/date.ts";
import type { Card } from "@/lib/types/card.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";

const card: Card = {
  id: "credit", user_id: "user", name: "Crédito", type: "credit", cutoff_day: 7,
  max_limit: null, payment_due_day: null, color: null, created_at: "", updated_at: "",
};
const credit: PaymentMethod = {
  id: "credit-method", user_id: "user", name: "Crédito", type: "card", card_id: card.id,
  icon: null, color: null, seq: 1, created_at: "", updated_at: "",
};
const installment: Installment = {
  id: "installment", user_id: "user", payment_method_id: credit.id, category_id: null,
  description: "Compra a plazos", start_date: "2026-10-25", currency: "MXN",
  total_amount: 900, monthly_amount: 300, total_months: 3, remaining_months: 2,
  created_at: "", updated_at: "",
};

test("Analíticas extiende el eje y suma compras y cuotas en su fecha, con cashback en su propio día", () => {
  const month = "2026-11";
  const { dailyActivity } = summarizeMonthlyActivity(month, {
    cards: [card], paymentMethods: [credit], categories: [], recurring: [],
    installments: [installment],
    transactions: [{
      id: "purchase", user_id: "user", payment_method_id: credit.id, category_id: null,
      type: "expense", amount: 650, currency: "MXN", description: null,
      date: "2026-10-25", created_at: "", updated_at: "",
    }],
    cashback: [{
      id: "cashback", user_id: "user", card_id: card.id, amount: 100, currency: "MXN",
      description: null, date: "2026-11-05", created_at: "",
    }],
    statementForMethod: () => cardStatementPeriod(month, card.cutoff_day),
  });
  const [{ days }] = dailyActivity;
  assert.equal(days.length, 37);
  assert.equal(days[0].date, "2026-10-25");
  assert.equal(days.at(-1)?.date, "2026-11-30");
  assert.deepEqual(days.filter(day => day.income || day.expense), [
    { date: "2026-10-25", income: 0, expense: 950 },
    { date: "2026-11-05", income: 100, expense: 0 },
  ]);
});

test("Una cuota ajustada por un mes corto se mantiene dentro del periodo de corte", () => {
  const month = "2026-03";
  const cardWithLateCutoff = { ...card, cutoff_day: 30 };
  const { dailyActivity } = summarizeMonthlyActivity(month, {
    cards: [cardWithLateCutoff], paymentMethods: [credit], categories: [],
    transactions: [], cashback: [], recurring: [],
    installments: [{ ...installment, start_date: "2026-01-31" }],
    statementForMethod: () => cardStatementPeriod(month, cardWithLateCutoff.cutoff_day),
  });
  assert.deepEqual(dailyActivity[0].days[0], { date: "2026-03-01", income: 0, expense: 300 });
});

test("La segunda cuota avanza un mes y conserva el día de compra", () => {
  const month = "2026-12";
  const { dailyActivity } = summarizeMonthlyActivity(month, {
    cards: [card], paymentMethods: [credit], categories: [], recurring: [], transactions: [], cashback: [],
    installments: [installment],
    statementForMethod: () => cardStatementPeriod(month, card.cutoff_day),
  });
  assert.deepEqual(dailyActivity[0].days[0], { date: "2026-11-25", income: 0, expense: 300 });
});

test("Los recurrentes usan el corte o el día programado aunque se paguen en otra fecha", () => {
  const month = "2026-02";
  const payment: RecurringPaymentMonthly = {
    id: "transfer", payment_id: "template", user_id: "user", month, amount: 500,
    type: "expense", category_id: null, payment_method_id: "transfer-method", currency: "MXN",
    scheduled_day: 31, is_active: true, is_paid: true, paid_at: "2026-03-02 10:00:00", created_at: "",
  };
  const { dailyActivity, movementBreakdown } = summarizeMonthlyActivity(month, {
    cards: [card], paymentMethods: [credit], categories: [], transactions: [], cashback: [], installments: [],
    recurring: [
      payment,
      { ...payment, id: "credit", payment_method_id: credit.id, amount: 600, is_paid: false, paid_at: null },
      { ...payment, id: "income", type: "income", amount: 200, scheduled_day: 3, is_paid: false, paid_at: null },
      { ...payment, id: "unscheduled", amount: 400, scheduled_day: null },
    ],
    statementForMethod: id => id === credit.id ? cardStatementPeriod(month, card.cutoff_day) : undefined,
  });
  const [{ days }] = dailyActivity;
  assert.equal(days.length, 28);
  assert.deepEqual(days.filter(day => day.income || day.expense), [
    { date: "2026-02-03", income: 200, expense: 0 },
    { date: "2026-02-07", income: 0, expense: 600 },
    { date: "2026-02-28", income: 0, expense: 500 },
  ]);
  assert.deepEqual(movementBreakdown[0].expense.movements.map(row => row.amount), [600, 500, 400]);
});

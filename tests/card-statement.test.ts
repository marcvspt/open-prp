import assert from "node:assert/strict";
import { test } from "node:test";
import { cardStatementPeriod, isPaymentLate, paymentDueDate } from "@/lib/date.ts";

test("el periodo incluye el corte actual y empieza después del corte anterior", () => {
  assert.deepEqual(cardStatementPeriod("2026-11", 7), {
    start: "2026-10-08",
    end: "2026-11-07",
  });
});

test("el corte del día 31 se ajusta a febrero y marzo empieza sin solaparse", () => {
  assert.deepEqual(cardStatementPeriod("2026-02", 31), {
    start: "2026-02-01",
    end: "2026-02-28",
  });
  assert.deepEqual(cardStatementPeriod("2024-02", 31), {
    start: "2024-02-01",
    end: "2024-02-29",
  });
  assert.deepEqual(cardStatementPeriod("2024-03", 31), {
    start: "2024-03-01",
    end: "2024-03-31",
  });
});

test("sin día de corte, el periodo abarca el mes calendario", () => {
  assert.deepEqual(cardStatementPeriod("2026-04", null), {
    start: "2026-04-01",
    end: "2026-04-30",
  });
});

test("el vencimiento cae en el mismo mes si el día de pago es posterior al corte", () => {
  assert.equal(paymentDueDate("2026-11", 7, 21), "2026-11-21");
});

test("con el mismo día de corte y pago, el vencimiento pasa al mes siguiente", () => {
  assert.equal(paymentDueDate("2026-12", 7, 7), "2027-01-07");
});

test("pagar el día de vencimiento cuenta como pago a tiempo", () => {
  assert.equal(isPaymentLate("2026-11", 7, 21, "2026-11-21T23:59:59"), false);
  assert.equal(isPaymentLate("2026-11", 7, 21, "2026-11-22T00:00:00"), true);
});

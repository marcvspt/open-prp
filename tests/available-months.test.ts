import assert from "node:assert/strict";
import { test } from "node:test";
import { getMonthOptions, isAvailableMonth, lastYearWindow } from "@/lib/date.ts";

test("el selector ofrece el mes siguiente, el actual y once meses anteriores", (context) => {
  context.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 11, 15, 12) });

  const months = getMonthOptions();

  assert.equal(months.length, 13);
  assert.deepEqual(months.slice(0, 3), ["2027-01", "2026-12", "2026-11"]);
  assert.equal(months.at(-1), "2026-01");
  assert.equal(isAvailableMonth("2027-01"), true);
  assert.equal(isAvailableMonth("2026-01"), true);
  assert.equal(isAvailableMonth("2025-12"), false);
  assert.equal(isAvailableMonth("2027-02"), false);
});

test("para una cuenta reciente, la ventana empieza en el mes de alta", (context) => {
  context.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 11, 15, 12) });
  const createdAt = "2026-11-15T12:00:00";

  assert.deepEqual(getMonthOptions(12, createdAt), ["2027-01", "2026-12", "2026-11"]);
  assert.deepEqual(lastYearWindow(createdAt), { from: "2026-11", to: "2027-01" });
  assert.equal(isAvailableMonth("2026-11", createdAt), true);
  assert.equal(isAvailableMonth("2026-10", createdAt), false);
});

test("la validación rechaza valores fuera del formato del selector", (context) => {
  context.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 11, 15, 12) });

  assert.equal(isAvailableMonth("2027-1"), false);
  assert.equal(isAvailableMonth("2026-13"), false);
  assert.equal(isAvailableMonth(""), false);
});

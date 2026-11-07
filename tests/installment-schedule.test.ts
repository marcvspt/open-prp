import assert from "node:assert/strict";
import { test } from "node:test";
import { installmentFirstMonth, installmentRemaining, isInstallmentInMonth } from "@/lib/date.ts";

test("una compra el día del corte entra en ese mes y al día siguiente entra en el próximo", () => {
  assert.equal(installmentFirstMonth("2026-11-07", 7), "2026-11");
  assert.equal(installmentFirstMonth("2026-11-08", 7), "2026-12");
});

test("sin corte, la primera cuota corresponde al mes de la compra", () => {
  assert.equal(installmentFirstMonth("2026-11-30", null), "2026-11");
});

test("una compra a fin de febrero entra en el corte del día 31 ajustado", () => {
  assert.equal(installmentFirstMonth("2024-02-29", 31), "2024-02");
});

test("un plazo de tres cuotas cruza el año y sigue vigente durante la última cuota", () => {
  const purchaseDate = "2026-11-08";
  const cutoffDay = 7;
  const total = 3;
  const firstMonth = installmentFirstMonth(purchaseDate, cutoffDay);

  assert.equal(isInstallmentInMonth("2026-11", purchaseDate, total, cutoffDay), false);
  assert.equal(installmentRemaining("2026-11", firstMonth, total), 3);
  assert.equal(isInstallmentInMonth("2026-12", purchaseDate, total, cutoffDay), true);
  assert.equal(installmentRemaining("2026-12", firstMonth, total), 2);
  assert.equal(isInstallmentInMonth("2027-02", purchaseDate, total, cutoffDay), true);
  assert.equal(installmentRemaining("2027-02", firstMonth, total), 0);
  assert.equal(isInstallmentInMonth("2027-03", purchaseDate, total, cutoffDay), false);
});

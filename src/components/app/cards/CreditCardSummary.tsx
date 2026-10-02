import { useState, useEffect, useRef, useCallback } from "react";
import type { Card } from "@/lib/types/card.ts";
import type { CardMonthly, CalculatedDebt } from "@/lib/types/card-monthly.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";
import { daysUntilPaymentDue, isPaymentLate } from "@/lib/date.ts";
import { formatCurrency } from "@/lib/format.ts";
import { apiData, fetchList, apiErrorMessage, isAbortError } from "@/lib/api-client.ts";
import { payCardDebtFull, payCardDebtPartial, CarryoverError } from "@/lib/dashboard/api.ts";
import { BTN_CANCEL } from "@/lib/i18n/general-fields.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

function dueDaysBorder(days: number): string {
  if (days <= 3) return "border-danger";
  if (days <= 8) return "border-warning";
  return "border-success";
}

function dueDaysBadge(days: number): string {
  if (days <= 3) return "bg-danger-bg text-danger-text";
  if (days <= 8) return "bg-warning-bg text-warning-text";
  return "bg-success-bg text-success-text";
}

interface CreditCardSummaryProps {
  initialCards: string;
  initialDebts: string;
  initialCalculated: string;
  initialPaymentMethods: string;
  initialCategories: string;
  initialMonth: string;
  locale?: LocaleCode;
}

export default function CreditCardSummary({
  initialCards,
  initialDebts,
  initialCalculated,
  initialPaymentMethods,
  initialCategories,
  initialMonth,
  locale = "es",
}: CreditCardSummaryProps) {
  const t = getLocaleDict(locale);
  const [cards] = useState<Card[]>(() => JSON.parse(initialCards));
  const [cardDebts, setCardDebts] = useState<CardMonthly[]>(() => JSON.parse(initialDebts));
  const [calculatedDebts, setCalculatedDebts] = useState<Record<string, CalculatedDebt>>(() => JSON.parse(initialCalculated));
  const [paymentMethods] = useState<PaymentMethod[]>(() => JSON.parse(initialPaymentMethods));
  const [categories] = useState<Category[]>(() => JSON.parse(initialCategories));
  const loadedMonthRef = useRef(initialMonth);

  const [payDialog, setPayDialog] = useState<{ debt: CardMonthly; card: Card } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  const [error, setError] = useState("");
  const paying = useRef(false);
  const [isPaying, setIsPaying] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const fetchData = useCallback(async (month: string) => {
    if (!month) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setError("");
    try {
      const options = { signal: controller.signal };
      const calculated = await Promise.all(cards.filter(c => c.type === "credit").map(async card => {
        const calc = await apiData<CalculatedDebt>(`/api/card-monthly/calculate?cardId=${card.id}&month=${month}`, options);
        return [card.id, calc] as const;
      }));
      // Calculations persist snapshots; read them after all writes finish.
      const debts = await fetchList<CardMonthly>(`/api/card-monthly?month=${month}`, options);
      if (controller.signal.aborted) return;
      setCardDebts(debts);
      setCalculatedDebts(Object.fromEntries(calculated));
      loadedMonthRef.current = month;
    } catch (err: unknown) {
      if (!controller.signal.aborted && !isAbortError(err)) setError(apiErrorMessage(err, t));
    }
  }, [cards, t]);

  useEffect(() => {
    // Calculation persists monthly snapshots, so the client still requests it on entry.
    void fetchData(new URLSearchParams(location.search).get("month") || loadedMonthRef.current);
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ month: string }>).detail;
      if (detail.month) void fetchData(detail.month);
    }
    window.addEventListener("monthchange", handler);
    return () => { requestController.current?.abort(); window.removeEventListener("monthchange", handler); };
  }, [fetchData]);
  function markDebtPaid(id: string, paidAt: string, paidAmount: number) {
    setCardDebts(prev => prev.map(d => d.id === id ? { ...d, is_paid: true, paid_at: paidAt, paid_amount: paidAmount } : d));
  }

  async function handlePayFull(id: string) {
    if (paying.current || !payDialog) return;
    requestController.current?.abort();
    paying.current = true;
    setIsPaying(true);
    setError("");
    const paidAt = payDate || undefined;
    try {
      await payCardDebtFull(id, paidAt, payDialog.debt.statement_balance);
      markDebtPaid(id, paidAt ?? new Date().toISOString(), payDialog.debt.statement_balance);
      setPayDialog(null);
    } catch (err: unknown) { setError(apiErrorMessage(err, t)); }
    finally { paying.current = false; setIsPaying(false); }
  }

  async function handlePayPartial() {
    if (paying.current || !payDialog) return;
    const amt = parseFloat(payAmount);
    if (!(amt > 0 && amt <= payDialog.debt.statement_balance)) return;
    requestController.current?.abort();
    paying.current = true;
    setIsPaying(true);
    setError("");
    const paidAt = payDate || undefined;
    try {
      await payCardDebtPartial({
        id: payDialog.debt.id, month: payDialog.debt.month,
        statementBalance: payDialog.debt.statement_balance, paidAmount: amt,
        cutoffDay: payDialog.card.cutoff_day,
        paymentMethodId: paymentMethods.find(p => p.card_id === payDialog.card.id)?.id ?? null,
        categoryId: categories.find(c => c.name === "card-balance")?.id ?? null, paidAt,
      });
      markDebtPaid(payDialog.debt.id, paidAt ?? new Date().toISOString(), amt);
      setPayDialog(null);
    } catch (err: unknown) {
      if (err instanceof CarryoverError) {
        markDebtPaid(payDialog.debt.id, paidAt ?? new Date().toISOString(), amt);
        setPayDialog(null);
        setError(t.error.paymentCarryover(apiErrorMessage(err.cause, t)));
      } else { setError(apiErrorMessage(err, t)); }
    } finally { paying.current = false; setIsPaying(false); }
  }
  const getCardDebt = (cardId: string) => cardDebts.find(d => d.card_id === cardId);
  const visibleCards = cards.filter(c => c.type === "credit");

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-4">
        {error && !payDialog && <p role="alert" className="text-sm text-danger-text">{error}</p>}
        {visibleCards.length === 0 ? (
          <p className="text-string-muted text-sm">{t.empty.creditCards}</p>
        ) : (
          visibleCards.map(card => {
            const debt = getCardDebt(card.id);
            const month = loadedMonthRef.current;
            const dueIn = card.payment_due_day != null ? daysUntilPaymentDue(month, card.cutoff_day, card.payment_due_day) : 0;
            const paidLate = debt?.is_paid === true && isPaymentLate(month, card.cutoff_day, card.payment_due_day, debt.paid_at);
            const calc = calculatedDebts[card.id] ?? null;
            const gross = calc ? calc.statement_balance : (debt?.statement_balance ?? 0);
            const paidAmount = debt?.paid_amount ?? 0;
            const settled = debt?.is_paid === true ? gross : paidAmount;
            const outstanding = Math.max(0, gross - settled);
            const committed = (calc ? calc.total_committed : gross) - settled;
            const available = card.max_limit != null ? card.max_limit - committed : 0;
            const borderClass = debt && !debt.is_paid ? dueDaysBorder(dueIn) : paidLate ? "border-danger" : "border-border";
            return (
              <div key={card.id} className={`bg-panel rounded-xl border-2 p-4 shadow-sm ${borderClass}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-string">{card.name}</h3>
                    <span className="text-xs text-string-muted uppercase">{t.badge.credit}</span>
                  </div>
                  {debt && !debt.is_paid && (
                    <button
                      onClick={() => { setError(""); setPayDialog({ debt, card }); setPayAmount(""); setPayDate(new Date().toLocaleDateString("sv")); }}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-success text-white hover:bg-success-hover transition-colors"
                    >
                      {t.cta.payCard}
                    </button>
                  )}
                  {debt?.is_paid && (
                    <span className={`px-3 py-1 text-xs font-medium rounded-lg ${paidLate ? "bg-danger-bg text-danger-text" : "bg-success-bg text-success-text"}`}>
                      {paidLate ? t.badge.paidLate : t.badge.paidF}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-string-muted">{t.stat.limit}</p>
                    <p className="font-mono font-medium text-success">{card.max_limit != null ? formatCurrency(card.max_limit) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-string-muted">{t.stat.calculatedDebt}</p>
                    {calc ? (
                      <div className="group relative">
                        <p className="font-mono font-medium text-danger cursor-help">{formatCurrency(outstanding, { showPlus: true })}</p>
                        <div className="absolute left-0 right-0 top-full mt-1 max-w-xs bg-panel border border-border rounded-lg shadow-lg p-3 text-xs z-10 hidden group-hover:block">
                          <div className="space-y-1">
                            <div className="flex justify-between"><span>{t.stat.purchases}</span><span className="font-mono text-danger">{formatCurrency(-calc.total_purchases, { showPlus: true })}</span></div>
                            <div className="flex justify-between"><span>{t.stat.installmentsThisMonth}</span><span className="font-mono text-danger">{formatCurrency(-calc.total_installments, { showPlus: true })}</span></div>
                            <div className="flex justify-between"><span>{t.stat.recurringPayments}</span><span className="font-mono text-danger">{formatCurrency(-calc.total_recurring, { showPlus: true })}</span></div>
                            <div className="flex justify-between"><span>{t.stat.cashback}</span><span className="font-mono text-success">{formatCurrency(calc.total_cashback, { showPlus: true })}</span></div>
                            {paidAmount > 0 && (
                              <div className="flex justify-between"><span>{t.stat.paidAmount}</span><span className="font-mono text-success">{formatCurrency(-paidAmount, { showPlus: true })}</span></div>
                            )}
                            <div className="border-t border-border pt-1 flex justify-between font-semibold"><span>{t.stat.monthDebt}</span><span className="font-mono">{formatCurrency(outstanding, { showPlus: true })}</span></div>
                            <div className="flex justify-between text-string-muted"><span>{t.stat.futureInstallments}</span><span className="font-mono">{formatCurrency(-calc.committed_installments, { showPlus: true })}</span></div>
                            <div className="border-t border-border pt-1 flex justify-between font-semibold"><span>{t.stat.totalCommitted}</span><span className="font-mono">{formatCurrency(committed, { showPlus: true })}</span></div>
                          </div>
                        </div>
                      </div>
                    ) : debt ? (
                      <p className="font-mono font-medium text-danger">{formatCurrency(outstanding, { showPlus: true })}</p>
                    ) : (
                      <p className="text-xs text-string-muted">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-string-muted">{t.stat.available}</p>
                    <p className={`font-mono font-medium ${available < 0 ? "text-danger" : "text-success"}`}>{formatCurrency(Math.max(0, available), { showPlus: true })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-string-muted">{t.stat.cutoffPayment}</p>
                    <p className="font-mono font-medium">{card.cutoff_day != null && card.payment_due_day != null ? `${card.cutoff_day} / ${card.payment_due_day}` : "—"}</p>
                  </div>
                </div>
                {debt && !debt.is_paid && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-string-muted">{t.stat.paymentDue}</span>
                    <span className={`font-medium ${dueDaysBadge(dueIn)} px-2 py-0.5 rounded`}>
                      {dueIn <= 0 ? t.badge.overdue : t.cards.dueIn(dueIn, card.payment_due_day!)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {payDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" role="dialog" aria-modal="true" aria-labelledby="pay-card-title" onClick={() => { if (!paying.current) setPayDialog(null); }}>
            <div className="bg-panel rounded-xl border border-border shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 id="pay-card-title" className="text-base font-semibold text-string mb-1">{t.cards.payCardTitle}</h3>
              <p className="text-sm text-string-muted mb-4">{payDialog.card.name} — {formatCurrency(payDialog.debt.statement_balance, { showPlus: true })}</p>
              {error && <p role="alert" className="text-sm text-danger-text mb-3">{error}</p>}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-string mb-1">{t.field.paymentDate}</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <button disabled={isPaying} onClick={() => handlePayFull(payDialog.debt.id)} className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors">
                  {t.cta.payAll} ({formatCurrency(payDialog.debt.statement_balance, { showPlus: true })})
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-string-muted">{t.cards.or}</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-string mb-1">{t.field.partialPayment}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={payDialog.debt.statement_balance}
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      placeholder={t.cards.zeroPlaceholder}
                      className="flex-1 block rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handlePayPartial}
                      disabled={isPaying || !payAmount || !(parseFloat(payAmount) > 0 && parseFloat(payAmount) <= payDialog.debt.statement_balance)}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-success text-white hover:bg-success-hover disabled:opacity-50 transition-colors"
                    >
                      {t.cta.payCard}
                    </button>
                  </div>
                  {payAmount && parseFloat(payAmount) > 0 && (
                    <p className="text-xs text-string-muted mt-1">
                      {t.cards.remainingNote(formatCurrency(payDialog.debt.statement_balance - parseFloat(payAmount), { showPlus: true }))}
                    </p>
                  )}
                </div>
                <button disabled={isPaying} onClick={() => setPayDialog(null)} className="w-full py-2 text-sm text-nav hover:text-string transition-colors">
                  {BTN_CANCEL(t)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LocaleProvider>
  );
}

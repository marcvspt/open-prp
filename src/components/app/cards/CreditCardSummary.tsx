import { useState, useEffect, useRef, useCallback } from "react";
import type { Card } from "@/lib/types/card.ts";
import type { CardMonthly, CalculatedDebt } from "@/lib/types/card-monthly.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";
import { daysUntilPaymentDue, isPaymentLate } from "@/lib/date.ts";
import { formatCurrency } from "@/lib/format.ts";
import { safeFetch, fetchList } from "@/lib/safeFetch.ts";
import { payCardDebtFull, payCardDebtPartial } from "@/lib/dashboard/api.ts";
import { BTN_CANCEL } from "@/lib/general-fields.ts";
import { labels } from "@/lib/labels.ts";

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
}

export default function CreditCardSummary({
  initialCards,
  initialDebts,
  initialCalculated,
  initialPaymentMethods,
  initialCategories,
  initialMonth,
}: CreditCardSummaryProps) {
  const [cards] = useState<Card[]>(() => JSON.parse(initialCards));
  const [cardDebts, setCardDebts] = useState<CardMonthly[]>(() => JSON.parse(initialDebts));
  const [calculatedDebts, setCalculatedDebts] = useState<Record<string, CalculatedDebt>>(() => JSON.parse(initialCalculated));
  const [paymentMethods] = useState<PaymentMethod[]>(() => JSON.parse(initialPaymentMethods));
  const [categories] = useState<Category[]>(() => JSON.parse(initialCategories));
  const loadedMonthRef = useRef(initialMonth);

  const [payDialog, setPayDialog] = useState<{ debt: CardMonthly; card: Card } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  const fetchCalculated = useCallback(async (month: string) => {
    if (!month) return;
    const creditCards = cards.filter(c => c.type === "credit");
    const calcs: Record<string, CalculatedDebt> = {};
    await Promise.all(creditCards.map(async (card) => {
      const calc = await safeFetch<CalculatedDebt>(`/api/card-monthly/calculate?cardId=${card.id}&month=${month}`);
      if (calc) calcs[card.id] = calc;
    }));
    setCalculatedDebts(calcs);
  }, [cards]);

  const fetchData = useCallback(async (month: string) => {
    if (!month) return;
    loadedMonthRef.current = month;

    const [debts] = await Promise.all([
      fetchList<CardMonthly>(`/api/card-monthly?month=${month}`),
    ]);
    setCardDebts(debts);

    await fetchCalculated(month);
  }, [fetchCalculated]);

  useEffect(() => {
    fetchCalculated(loadedMonthRef.current);
  }, [fetchCalculated]);

  useEffect(() => {
    const urlMonth = new URLSearchParams(location.search).get("month") || "";
    if (urlMonth && urlMonth !== loadedMonthRef.current) {
      fetchData(urlMonth);
    }
  }, [fetchData]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { month: string };
      if (detail.month && detail.month !== loadedMonthRef.current) {
        fetchData(detail.month);
      }
    }
    window.addEventListener("monthchange", handler);
    return () => window.removeEventListener("monthchange", handler);
  }, [fetchData]);

  function markDebtPaid(id: string, paidAt: string) {
    setCardDebts(prev => prev.map(d => d.id === id ? { ...d, is_paid: true, paid_at: paidAt } : d));
  }

  async function handlePayFull(id: string) {
    const paidAt = payDate || undefined;
    if (await payCardDebtFull(id, paidAt)) markDebtPaid(id, paidAt ?? new Date().toISOString());
    setPayDialog(null);
  }

  async function handlePayPartial() {
    if (!payDialog) return;
    const amt = parseFloat(payAmount);
    if (!(amt > 0 && amt <= payDialog.debt.statement_balance)) return;
    const paidAt = payDate || undefined;
    const ok = await payCardDebtPartial({
      id: payDialog.debt.id,
      month: payDialog.debt.month,
      statementBalance: payDialog.debt.statement_balance,
      paidAmount: amt,
      cutoffDay: payDialog.card.cutoff_day,
      paymentMethodId: paymentMethods.find(p => p.card_id === payDialog.card.id)?.id ?? null,
      categoryId: categories.find(c => c.name === "card-balance")?.id ?? null,
      paidAt,
    });
    if (ok) markDebtPaid(payDialog.debt.id, paidAt ?? new Date().toISOString());
    setPayDialog(null);
  }

  const getCardDebt = (cardId: string) => cardDebts.find(d => d.card_id === cardId);
  const visibleCards = cards.filter(c => c.type === "credit");

  return (
    <div className="space-y-4">
      {visibleCards.length === 0 ? (
        <p className="text-string-muted text-sm">{labels.empty.creditCards}</p>
      ) : (
        visibleCards.map(card => {
          const debt = getCardDebt(card.id);
          const month = loadedMonthRef.current;
          const dueIn = card.payment_due_day != null ? daysUntilPaymentDue(month, card.cutoff_day, card.payment_due_day) : 0;
          const paidLate = debt?.is_paid === true && isPaymentLate(month, card.cutoff_day, card.payment_due_day, debt.paid_at);
          const calc = calculatedDebts[card.id] ?? null;
          const committed = calc ? calc.total_committed : (debt?.statement_balance ?? 0);
          const available = card.max_limit != null ? card.max_limit - committed : 0;
          const borderClass = debt && !debt.is_paid ? dueDaysBorder(dueIn) : paidLate ? "border-danger" : "border-border";
          return (
            <div key={card.id} className={`bg-panel rounded-xl border-2 p-4 shadow-sm ${borderClass}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-string">{card.name}</h3>
                  <span className="text-xs text-string-muted uppercase">{labels.badge.credit}</span>
                </div>
                {debt && !debt.is_paid && (
                  <button
                    onClick={() => { setPayDialog({ debt, card }); setPayAmount(""); setPayDate(new Date().toLocaleDateString("sv")); }}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-success text-white hover:bg-success-hover transition-colors"
                  >
                    {labels.cta.payCard}
                  </button>
                )}
                {debt?.is_paid && (
                  <span className={`px-3 py-1 text-xs font-medium rounded-lg ${paidLate ? "bg-danger-bg text-danger-text" : "bg-success-bg text-success-text"}`}>
                    {paidLate ? labels.badge.paidLate : labels.badge.paidF}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-string-muted">{labels.stat.limit}</p>
                  <p className="font-mono font-medium text-success">{card.max_limit != null ? formatCurrency(card.max_limit) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-string-muted">{labels.stat.calculatedDebt}</p>
                  {calc ? (
                    <div className="group relative">
                      <p className="font-mono font-medium text-danger cursor-help">{formatCurrency(calc.statement_balance)}</p>
                      <div className="absolute left-0 right-0 top-full mt-1 max-w-xs bg-panel border border-border rounded-lg shadow-lg p-3 text-xs z-10 hidden group-hover:block">
                        <div className="space-y-1">
                          <div className="flex justify-between"><span>{labels.stat.purchases}</span><span className="font-mono text-danger">-{formatCurrency(calc.total_purchases)}</span></div>
                          <div className="flex justify-between"><span>{labels.stat.installmentsThisMonth}</span><span className="font-mono text-danger">-{formatCurrency(calc.total_installments)}</span></div>
                          <div className="flex justify-between"><span>{labels.stat.recurringPayments}</span><span className="font-mono text-danger">-{formatCurrency(calc.total_recurring)}</span></div>
                          <div className="flex justify-between"><span>{labels.stat.cashback}</span><span className="font-mono text-success">+{formatCurrency(calc.total_cashback)}</span></div>
                          <div className="border-t border-border pt-1 flex justify-between font-semibold"><span>{labels.stat.monthDebt}</span><span className="font-mono">{formatCurrency(calc.statement_balance)}</span></div>
                          <div className="flex justify-between text-string-muted"><span>{labels.stat.futureInstallments}</span><span className="font-mono">-{formatCurrency(calc.committed_installments)}</span></div>
                          <div className="border-t border-border pt-1 flex justify-between font-semibold"><span>{labels.stat.totalCommitted}</span><span className="font-mono">{formatCurrency(calc.total_committed)}</span></div>
                        </div>
                      </div>
                    </div>
                  ) : debt ? (
                    <p className="font-mono font-medium text-danger">{formatCurrency(debt.statement_balance)}</p>
                  ) : (
                    <p className="text-xs text-string-muted">-</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-string-muted">{labels.stat.available}</p>
                  <p className={`font-mono font-medium ${available < 0 ? "text-danger" : "text-success"}`}>{formatCurrency(Math.max(0, available))}</p>
                </div>
                <div>
                  <p className="text-xs text-string-muted">{labels.stat.cutoffPayment}</p>
                  <p className="font-mono font-medium">{card.cutoff_day != null && card.payment_due_day != null ? `${card.cutoff_day} / ${card.payment_due_day}` : "—"}</p>
                </div>
              </div>
              {debt && !debt.is_paid && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-string-muted">{labels.stat.paymentDue}</span>
                  <span className={`font-medium ${dueDaysBadge(dueIn)} px-2 py-0.5 rounded`}>
                    {dueIn <= 0 ? labels.badge.overdue : labels.cards.dueIn(dueIn, card.payment_due_day!)}
                  </span>
                </div>
              )}
            </div>
          );
        })
      )}

      {payDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setPayDialog(null)}>
          <div className="bg-panel rounded-xl border border-border shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-string mb-1">{labels.cards.payCardTitle}</h3>
            <p className="text-sm text-string-muted mb-4">{payDialog.card.name} — {formatCurrency(payDialog.debt.statement_balance)}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-string mb-1">{labels.field.paymentDate}</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <button onClick={() => handlePayFull(payDialog.debt.id)} className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors">
                {labels.cta.payAll} ({formatCurrency(payDialog.debt.statement_balance)})
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-string-muted">{labels.cards.or}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-string mb-1">{labels.field.partialPayment}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={payDialog.debt.statement_balance}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder={labels.cards.zeroPlaceholder}
                    className="flex-1 block rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handlePayPartial}
                    disabled={!payAmount || parseFloat(payAmount) <= 0}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-success text-white hover:bg-success-hover disabled:opacity-50 transition-colors"
                  >
                    {labels.cta.payCard}
                  </button>
                </div>
                {payAmount && parseFloat(payAmount) > 0 && (
                  <p className="text-xs text-string-muted mt-1">
                    {labels.cards.remainingNote(formatCurrency(payDialog.debt.statement_balance - parseFloat(payAmount)))}
                  </p>
                )}
              </div>
              <button onClick={() => setPayDialog(null)} className="w-full py-2 text-sm text-nav hover:text-string transition-colors">
                {BTN_CANCEL}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { safeFetch } from "@/lib/safeFetch.ts";
import { currentMonthStr } from "@/lib/date.ts";
import { displayPaymentMethodName } from "@/lib/i18n/payment-method-labels.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";
import type { RecurringPaymentMonthly, RecurringPayment } from "@/lib/types/recurring-payment.ts";

type PaymentType = "income" | "expense";

interface Props {
  initialMonth: string;
  initialPayments: string;
  initialMonthly: string;
  locale?: LocaleCode;
}

function getMonthFromUrl(): string {
  const m = new URLSearchParams(location.search).get("month");
  return m && /^\d{4}-\d{2}$/.test(m) ? m : "";
}

export default function RecurringPaymentsMonthly({ initialMonth, initialPayments, initialMonthly, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const [payments] = useState<RecurringPayment[]>(() => JSON.parse(initialPayments));
  const [monthly, setMonthly] = useState<RecurringPaymentMonthly[]>(() => JSON.parse(initialMonthly));
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const loadedMonthRef = useRef(initialMonth);

  const fetchMonthly = useCallback(async (month: string) => {
    setLoading(true);
    const data = await safeFetch<RecurringPaymentMonthly[]>(
      `/api/recurring-payment-monthly?month=${month}`
    );
    if (data) {
      setMonthly(data);
      loadedMonthRef.current = month;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const urlMonth = getMonthFromUrl() || currentMonthStr();
    if (urlMonth !== loadedMonthRef.current) {
      fetchMonthly(urlMonth);
    }
  }, [fetchMonthly]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { month: string };
      if (detail.month !== loadedMonthRef.current) {
        const m = detail.month || currentMonthStr();
        fetchMonthly(m);
      }
    }
    window.addEventListener("monthchange", handler);
    return () => window.removeEventListener("monthchange", handler);
  }, [fetchMonthly]);

  async function handleTogglePaid(paymentId: string) {
    setTogglingId(paymentId);
    const m = monthly.find(sm => sm.payment_id === paymentId);
    if (!m) return;
    const ok = await safeFetch(`/api/recurring-payment-monthly?id=${m.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_paid: !m.is_paid }),
    });
    if (ok) await fetchMonthly(loadedMonthRef.current);
    setTogglingId(null);
  }

  async function handleRemoveFromMonth(paymentId: string) {
    const m = monthly.find(sm => sm.payment_id === paymentId);
    if (!m) return;
    if (m.is_paid) {
      const ok = await safeFetch(`/api/recurring-payment-monthly?id=${m.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_paid: false }),
      });
      if (ok) await fetchMonthly(loadedMonthRef.current);
    } else {
      const ok = await safeFetch(`/api/recurring-payment-monthly?id=${m.id}`, {
        method: "DELETE",
      });
      if (ok) await fetchMonthly(loadedMonthRef.current);
    }
  }

  async function handleAddToMonth(payment: RecurringPayment) {
    const ok = await safeFetch(`/api/recurring-payments/${payment.id}/monthly`, {
      method: "POST",
      body: JSON.stringify({ month: loadedMonthRef.current, amount: payment.default_amount }),
    });
    if (ok) await fetchMonthly(loadedMonthRef.current);
  }

  function toggleCategory(name: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const monthlyMap = new Map(monthly.map(sm => [sm.payment_id, sm]));

  function renderPaymentCard(payment: RecurringPayment) {
    const entry = monthlyMap.get(payment.id);
    const isAdded = !!entry;
    const isPaid = entry?.is_paid ?? false;
    const isIncome = payment.type === "income";
    const amount = entry?.amount ?? payment.default_amount;
    const textColor = isIncome ? "text-success" : "text-danger";

    return (
      <div
        className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
          isPaid
            ? "border-success/30 bg-success/5"
            : isAdded
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-panel hover:border-primary/40 hover:shadow-sm"
        }`}
      >
        {isAdded && (
          <button
            onClick={() => handleRemoveFromMonth(payment.id)}
            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-xs text-string-muted hover:text-danger hover:bg-danger/10 rounded transition-colors cursor-pointer"
            aria-label={isPaid ? t.cta.backToPending : t.cta.removeFromMonth}
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
        <div className="space-y-2">
          <div className={`font-medium text-sm leading-tight ${isPaid ? "text-string-muted" : "text-string"}`}>
            {payment.name}
          </div>
          <div className={`text-lg font-semibold ${isPaid ? "text-string-muted" : textColor}`}>
            {isIncome ? "+" : "-"}${Number(amount).toLocaleString()}
          </div>
          {payment.payment_method_name && (
            <div className="text-xs text-string-muted">
              {payment.payment_method_icon || "💳"} {displayPaymentMethodName({ name: payment.payment_method_name, type: payment.payment_method_type ?? "" }, t)}
            </div>
          )}
        </div>
        {isPaid ? (
          <div className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-success-bg text-success-text text-center">
            {isIncome ? t.badge.received : t.badge.paid}
          </div>
        ) : isAdded ? (
          <button
            onClick={() => handleTogglePaid(payment.id)}
            disabled={togglingId === payment.id}
            className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer"
          >
            {togglingId === payment.id ? "..." : isIncome ? t.cta.markReceived : t.cta.markPaid}
          </button>
        ) : (
          <button
            onClick={() => handleAddToMonth(payment)}
            className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-all cursor-pointer"
          >
            {t.cta.addToMonth}
          </button>
        )}
      </div>
    );
  }

  function renderTypeStats(type: PaymentType, label: string, colorClass: string, icon: string) {
    const typeMonthly = monthly.filter(sm => sm.type === type);
    const typeTotal = typeMonthly.reduce((s, sm) => s + Number(sm.amount), 0);
    const typeReceived = typeMonthly.filter(sm => sm.is_paid);
    const typePending = typeMonthly.filter(sm => !sm.is_paid);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className={`text-base font-semibold ${colorClass}`}>{icon} {label}</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">{t.stat.total}</div>
            <div className={`text-lg font-semibold ${colorClass}`}>
              ${Number(typeTotal).toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">{type === "income" ? t.stat.received : t.stat.paid}</div>
            <div className="text-lg font-semibold text-success">{typeReceived.length}/{typeMonthly.length}</div>
          </div>
          <div className="col-span-2 lg:col-span-1 p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">{t.stat.pending}</div>
            <div className="text-lg font-semibold text-warning">
              ${Number(typePending.reduce((s, sm) => s + Number(sm.amount), 0)).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderCategoryGroup(type: PaymentType) {
    const filtered = payments.filter(p => p.type === type);
    const categories = [...new Set(filtered.map(p => p.category_name ?? t.recurring.noCategory))];
    if (categories.length === 0) return null;

    return (
      <div className="space-y-3">
        {categories.map(category => {
          const catFiltered = filtered.filter(p => (p.category_name ?? t.recurring.noCategory) === category);
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 text-sm font-medium text-string-muted mb-2 hover:text-string transition-colors"
              >
                <span className={`transition-transform ${collapsedCategories.has(category) ? "" : "rotate-90"}`}>
                  ▶
                </span>
                {category}
              </button>
              {!collapsedCategories.has(category) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {catFiltered.map((payment, i) => {
                    const isLastOdd = i === catFiltered.length - 1 && catFiltered.length % 2 !== 0;
                    return (
                      <div key={payment.id} className={isLastOdd ? "col-span-2 sm:col-span-1" : ""}>
                        {renderPaymentCard(payment)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const incomeTotal = monthly.filter(sm => sm.type === "income").reduce((s, sm) => s + Number(sm.amount), 0);
  const expenseTotal = monthly.filter(sm => sm.type === "expense").reduce((s, sm) => s + Number(sm.amount), 0);
  const netTotal = incomeTotal - expenseTotal;

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-6 relative">
        {loading && (
          <div className="absolute top-0 right-0">
            <span className="text-xs text-string-muted">{t.common.loading}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">{t.stat.incomes}</div>
            <div className="text-lg font-semibold text-success">${Number(incomeTotal).toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">{t.stat.expenses}</div>
            <div className="text-lg font-semibold text-danger">${Number(expenseTotal).toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">{t.stat.balance}</div>
            <div className={`text-lg font-semibold ${netTotal >= 0 ? "text-success" : "text-danger"}`}>
              ${Number(netTotal).toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">{t.stat.movements}</div>
            <div className="text-lg font-semibold text-primary">{monthly.length}</div>
          </div>
        </div>

        {renderTypeStats("income", t.stat.incomes, "text-success", "📥")}
        {renderTypeStats("expense", t.stat.expenses, "text-danger", "💸")}
        {payments.length === 0 ? (
          <div className="text-string-muted text-sm">{t.empty.recurringMonthly}</div>
        ) : (
          <>
            {renderCategoryGroup("income")}
            {renderCategoryGroup("expense")}
          </>
        )}
      </div>
    </LocaleProvider>
  );
}

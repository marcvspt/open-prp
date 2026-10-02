import { useMemo, useState, useEffect } from "react";
import { fetchList, apiErrorMessage } from "@/lib/api-client.ts";
import { currentMonthStr, isAvailableMonth } from "@/lib/date.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { Card } from "@/lib/types/card.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import { formatCurrency } from "@/lib/format.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface InstallmentsSummaryProps {
  initialData: string;
  initialMonth: string;
  createdAt?: string;
  initialCards: string;
  initialPaymentMethods: string;
  locale?: LocaleCode;
}

export default function InstallmentsSummary({ initialData, initialMonth, createdAt, initialCards, initialPaymentMethods, locale = "es" }: InstallmentsSummaryProps) {
  const t = getLocaleDict(locale);
  const [installments, setInstallments] = useState<Installment[]>(() => JSON.parse(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let controller: AbortController | undefined;
    let loadedMonth = initialMonth;
    function refresh() {
      const value = new URLSearchParams(location.search).get("summary_month");
      const month = value && isAvailableMonth(value, createdAt) ? value : currentMonthStr();
      if (value && month !== value) {
        const url = new URL(location.href);
        url.searchParams.delete("summary_month");
        history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
      controller?.abort();
      setError("");
      if (month === loadedMonth) { setLoading(false); return; }
      const request = new AbortController();
      controller = request;
      setLoading(true);
      void fetchList<Installment>(`/api/installments/summary?month=${month}`, { signal: request.signal })
        .then(data => { if (!request.signal.aborted) { setInstallments(data); loadedMonth = month; } })
        .catch((err: unknown) => { if (!request.signal.aborted) setError(apiErrorMessage(err, t)); })
        .finally(() => { if (!request.signal.aborted) setLoading(false); });
    }
    window.addEventListener("monthchange", refresh);
    window.addEventListener("popstate", refresh);
    return () => { controller?.abort(); window.removeEventListener("monthchange", refresh); window.removeEventListener("popstate", refresh); };
  }, [initialMonth, createdAt, t]);
  const cards: Card[] = useMemo(() => JSON.parse(initialCards), [initialCards]);
  const paymentMethods: PaymentMethod[] = useMemo(() => JSON.parse(initialPaymentMethods), [initialPaymentMethods]);

  const remainingToPay = installments.reduce((s, i) => s + Number(i.remaining_months) * Number(i.monthly_amount), 0);
  const totalFees = installments.reduce((s, i) => s + Number(i.total_months), 0);

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-4">
        {loading && <p role="status" className="text-sm text-string-muted">{t.common.loading}</p>}
        {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-panel border border-border shadow-sm text-center">
            <p className="text-xs text-string-muted mb-1">{t.stat.activeInstallments}</p>
            <p className="text-2xl font-bold text-primary">{installments.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-panel border border-border shadow-sm text-center">
            <p className="text-xs text-string-muted mb-1">{t.stat.remainingToPay}</p>
            <p className="text-2xl font-bold text-danger">{formatCurrency(-remainingToPay, { showPlus: true })}</p>
          </div>
          <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-panel border border-border shadow-sm text-center">
            <p className="text-xs text-string-muted mb-1">{t.stat.totalFees}</p>
            <p className="text-2xl font-bold text-warning">{totalFees}</p>
          </div>
        </div>
        {installments.length === 0 ? (
          <p className="text-string-muted text-sm">{t.empty.activeInstallments}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {installments.map(i => {
              const pm = paymentMethods.find(p => p.id === i.payment_method_id);
              const card = pm?.card_id ? cards.find(c => c.id === pm.card_id) : undefined;
              const remainingAmount = Number(i.remaining_months) * Number(i.monthly_amount);
              const totalAmount = Number(i.total_amount);
              return (
                <div key={i.id} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${i.remaining_months <= 0 ? "bg-success-bg text-success-text" : i.remaining_months <= 3 ? "bg-warning-bg text-warning-text" : "bg-info-bg text-info-text"}`}>
                      {i.remaining_months}/{i.total_months}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-string mb-1">{i.description}</p>
                  <p className="text-xs text-string-muted mb-3">{card?.name ?? pm?.name ?? t.field.noCard}</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-string-muted">{t.stat.total}</span>
                      <span className="font-mono font-medium text-string">{formatCurrency(-totalAmount, { showPlus: true })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-string-muted">{t.stat.fee}</span>
                      <span className="font-mono font-medium text-danger">{formatCurrency(-Number(i.monthly_amount), { showPlus: true })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-string-muted">{t.stat.remaining}</span>
                      <span className="font-mono font-medium text-warning">{formatCurrency(-remainingAmount, { showPlus: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LocaleProvider>
  );
}

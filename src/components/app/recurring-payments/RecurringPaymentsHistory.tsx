import { useState, useEffect, useRef } from "react";
import { fetchList } from "@/lib/safeFetch.ts";
import { monthLabel } from "@/lib/date.ts";
import { CURRENCY_SYMBOL } from "@/lib/i18n/general-fields.ts";
import { displayCategoryName } from "@/lib/i18n/category-labels.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";

interface Props {
  initialData: string;
  categories: string;
  locale?: LocaleCode;
}

export default function RecurringPaymentsHistory({ initialData, categories, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const [items, setItems] = useState<RecurringPaymentMonthly[]>(() => JSON.parse(initialData));
  const [loading, setLoading] = useState(false);
  const loadedQsRef = useRef("");
  const catMap = JSON.parse(categories) as Record<string, { icon: string | null; name: string; type: string }>;

  useEffect(() => {
    function fetchHistory() {
      const month = new URLSearchParams(location.search).get("month");
      const url = month && /^\d{4}-\d{2}$/.test(month)
        ? `/api/recurring-payment-monthly/history?month=${month}`
        : "/api/recurring-payment-monthly/history";
      const qs = new URLSearchParams(location.search).toString();
      if (qs === loadedQsRef.current) return;
      loadedQsRef.current = qs;
      setLoading(true);
      fetchList<RecurringPaymentMonthly>(url)
        .then(setItems)
        .finally(() => setLoading(false));
    }

    loadedQsRef.current = new URLSearchParams(location.search).toString();
    fetchHistory();

    function handler() {
      fetchHistory();
    }
    window.addEventListener("monthchange", handler);
    return () => window.removeEventListener("monthchange", handler);
  }, []);

  return (
    <LocaleProvider locale={locale}>
      <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
        <h2 className="text-base font-semibold text-string mb-3">{t.recurring.historyTitle}</h2>
        {loading ? (
          <p className="text-sm text-string-muted">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-string-muted">{t.empty.history}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-string-muted text-xs uppercase border-b border-border">
                  <th className="text-left px-3 py-2">{t.table.month}</th>
                  <th className="text-left px-3 py-2">{t.table.description}</th>
                  <th className="text-right px-3 py-2">{t.table.amount}</th>
                  <th className="text-center px-3 py-2">{t.table.type}</th>
                  <th className="text-center px-3 py-2">{t.table.currency}</th>
                  <th className="text-center px-3 py-2">{t.table.category}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((sp, i) => {
                  const cat = sp.category_id ? catMap[sp.category_id] : null;
                  return (
                    <tr key={`${sp.month}-${sp.payment_id}-${i}`} className="border-b border-border/50">
                      <td className="px-3 py-2 text-string-muted">{monthLabel(sp.month, locale)}</td>
                      <td className="px-3 py-2 font-medium text-string">{sp.name ?? "?"}</td>
                      <td className={`px-3 py-2 text-right font-mono ${sp.type === "income" ? "text-success" : "text-danger"}`}>
                        {sp.type === "income" ? "+" : "-"}{CURRENCY_SYMBOL[sp.currency || "MXN"] || "$"}{Number(sp.amount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${sp.type === "income" ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text"}`}>
                          {sp.type === "income" ? t.badge.income : t.badge.expense}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-string-muted">{CURRENCY_SYMBOL[sp.currency || "MXN"] || "$"} {sp.currency || "MXN"}</td>
                      <td className="px-3 py-2 text-center">
                        {cat ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{cat.icon || "📂"} {displayCategoryName(cat, t)}</span> : <span className="text-xs text-string-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LocaleProvider>
  );
}

import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import type { Installment } from "@/lib/types/installment.ts";
import { formatDate } from "@/lib/date.ts";
import { FILTER_WRAP_CLASS, FILTER_INPUT_CLASS, FILTER_LIMPIAR_CLASS, FILTER_GRID_CLASS, FILTER_CTA_CLASS, BTN_CLEAR, FILTER_ALL_CATEGORIES, FILTER_ALL_PAYMENT_METHODS, FILTER_ALL_STATUS_INSTALLMENTS, FILTER_ALL_MONTHS, FILTER_SEARCH_DESC, FILTER_LABEL_CATEGORY, FILTER_LABEL_PAYMENT_METHOD, FILTER_LABEL_STATUS } from "@/lib/i18n/filter-fields.ts";
import { BTN_EDIT, BTN_DELETE, CURRENCY_SYMBOL } from "@/lib/i18n/general-fields.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Props {
  initialMonth: string;
  activeOnly: boolean;
  paymentMethods: { id: string; icon: string | null; name: string }[];
  categories: { id: string; icon: string | null; name: string }[];
  initialData?: string;
  createdAt?: string;
  locale?: LocaleCode;
}

export default function InstallmentsFilterable({ initialMonth, activeOnly: initialActive, paymentMethods, categories, initialData, createdAt, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const parsedInitial = initialData ? JSON.parse(initialData) as Installment[] : undefined;
  const { filters, setFilter, clearFilters, data, loading, error } = useFilteredData<Installment[]>("/api/installments", {
    ...(initialActive ? { active_only: "true" } : {}),
    ...(initialMonth ? { month: initialMonth } : {}),
  }, parsedInitial);

  const items = data ?? [];

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text" role="alert">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className={FILTER_GRID_CLASS}>
            <div className={FILTER_WRAP_CLASS}>
              <MonthSelector value={filters.month || ""} onChange={(m) => setFilter("month", m)} createdAt={createdAt} allLabel={FILTER_ALL_MONTHS(t)} locale={locale} />
            </div>
            <div className={FILTER_WRAP_CLASS}>
              <Select
                value={filters.active_only ?? "true"}
                onChange={(v) => setFilter("active_only", v)}
                options={[
                  { value: "true", label: t.filter.activeOnly },
                  { value: "", label: FILTER_ALL_STATUS_INSTALLMENTS(t) },
                ]}
                placeholder={FILTER_LABEL_STATUS(t)}
                ariaLabel={FILTER_LABEL_STATUS(t)}
              />
            </div>
            <div className={FILTER_WRAP_CLASS}>
              <Select
                value={filters.payment_method_id || ""}
                onChange={(v) => setFilter("payment_method_id", v)}
                options={[{ value: "", label: FILTER_ALL_PAYMENT_METHODS(t) }, ...paymentMethods.map(pm => ({ value: pm.id, label: `${pm.icon || "💳"} ${pm.name}` }))]}
                placeholder={FILTER_LABEL_PAYMENT_METHOD(t)}
                ariaLabel={FILTER_LABEL_PAYMENT_METHOD(t)}
              />
            </div>
            <div className={FILTER_WRAP_CLASS}>
              <Select
                value={filters.category_id || ""}
                onChange={(v) => setFilter("category_id", v)}
                options={[{ value: "", label: FILTER_ALL_CATEGORIES(t) }, ...categories.map(c => ({ value: c.id, label: `${c.icon || "📂"} ${c.name}` }))]}
                placeholder={FILTER_LABEL_CATEGORY(t)}
                ariaLabel={FILTER_LABEL_CATEGORY(t)}
              />
            </div>
            <input
              type="search"
              data-search-input
              defaultValue={filters.q || ""}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder={FILTER_SEARCH_DESC(t)}
              className={FILTER_INPUT_CLASS}
            />
            <button onClick={clearFilters} className={FILTER_LIMPIAR_CLASS}>{BTN_CLEAR(t)}</button>
          </div>
          <button data-create="installments" className={FILTER_CTA_CLASS}>{t.cta.newInstallment}</button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          {loading ? (
            <div className="p-4 text-center text-string-muted text-sm">{t.common.loading}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-string-muted text-sm">{t.empty.installments}</div>
          ) : (
            <table className="w-full text-sm" aria-label={t.page.installments}>
              <thead>
                <tr className="text-xs uppercase text-string-muted border-b border-border">
                  <th className="text-center px-4 py-3 font-medium">{t.table.date}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.description}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.table.total}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.table.fee}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.currency}</th>
                  <th className="text-center px-4 py-3 font-medium">{t.table.progress}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.method}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.category}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => {
                  const pm = paymentMethods.find(p => p.id === i.payment_method_id);
                  const cat = categories.find(c => c.id === i.category_id);
                  const progressClass = i.remaining_months <= 0 ? "bg-success-bg text-success-text" : i.remaining_months <= 3 ? "bg-warning-bg text-warning-text" : "bg-info-bg text-info-text";
                  return (
                    <tr key={i.id} className="hover:bg-nav-hover border-b border-border/50">
                      <td className="px-4 py-3 text-center text-xs font-semibold whitespace-nowrap">{formatDate(i.start_date, locale)}</td>
                      <td className="px-4 py-3 font-medium">{i.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-danger whitespace-nowrap">{CURRENCY_SYMBOL[i.currency] ?? "$"}{Number(i.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-danger whitespace-nowrap">{CURRENCY_SYMBOL[i.currency] ?? "$"}{Number(i.monthly_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-string-muted">{CURRENCY_SYMBOL[i.currency] ?? "$"} {i.currency || "MXN"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${progressClass}`}>{i.remaining_months}/{i.total_months}</span>
                      </td>
                      <td className="px-4 py-3">{pm ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{pm.icon || "💳"} {pm.name}</span> : "-"}</td>
                      <td className="px-4 py-3">{cat ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{cat.icon || "📂"} {cat.name}</span> : "-"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button data-edit-installments={i.id} className="text-primary hover:text-primary-hover text-xs font-medium cursor-pointer">{BTN_EDIT(t)}</button>
                        <button data-delete-installments={i.id} className="text-danger hover:text-danger-hover text-xs font-medium cursor-pointer">{BTN_DELETE(t)}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </LocaleProvider>
  );
}

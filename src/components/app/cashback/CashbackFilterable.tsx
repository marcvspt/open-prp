import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import type { Cashback } from "@/lib/types/cashback.ts";
import { formatDate } from "@/lib/date.ts";
import { FILTER_WRAP_CLASS, FILTER_INPUT_CLASS, FILTER_LIMPIAR_CLASS, FILTER_GRID_CLASS, FILTER_CTA_CLASS, BTN_CLEAR, FILTER_ALL_CARDS, FILTER_ALL_MONTHS, FILTER_SEARCH_DESC, FILTER_LABEL_CARD } from "@/lib/i18n/filter-fields.ts";
import { BTN_EDIT, BTN_DELETE, CURRENCY_SYMBOL } from "@/lib/i18n/general-fields.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Props {
  initialMonth: string;
  cards: { id: string; name: string; type: string }[];
  initialData?: string;
  createdAt?: string;
  locale?: LocaleCode;
}

const cardEmoji = (type: string) => type === "credit" ? "💳" : type === "debit" ? "🏦" : "🎫";

export default function CashbackFilterable({ initialMonth, cards, initialData, createdAt, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const parsedInitial = initialData ? JSON.parse(initialData) as Cashback[] : undefined;
  const { filters, setFilter, clearFilters, data, loading, error } = useFilteredData<Cashback[]>("/api/cashback", {
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
              <MonthSelector value={filters.month || initialMonth} onChange={(m) => setFilter("month", m)} createdAt={createdAt} allLabel={FILTER_ALL_MONTHS(t)} locale={locale} />
            </div>
            <div className={FILTER_WRAP_CLASS}>
              <Select
                value={filters.card_id || ""}
                onChange={(v) => setFilter("card_id", v)}
                options={[{ value: "", label: FILTER_ALL_CARDS(t) }, ...cards.map(c => ({ value: c.id, label: `${cardEmoji(c.type)} ${c.name}` }))]}
                placeholder={FILTER_LABEL_CARD(t)}
                ariaLabel={FILTER_LABEL_CARD(t)}
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
          <button data-create="cashback" className={FILTER_CTA_CLASS}>{t.cta.newCashback}</button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          {loading ? (
            <div className="p-4 text-center text-string-muted text-sm">{t.common.loading}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-string-muted text-sm">{t.empty.cashback}</div>
          ) : (
            <table className="w-full text-sm" aria-label={t.page.cashback}>
              <thead>
                <tr className="text-xs uppercase text-string-muted border-b border-border">
                  <th className="text-left px-4 py-3 font-medium">{t.table.date}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.description}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.table.amount}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.currency}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.card}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => {
                  const card = cards.find(ca => ca.id === c.card_id);
                  return (
                    <tr key={c.id} className="hover:bg-nav-hover border-b border-border/50">
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatDate(c.date, locale)}</td>
                      <td className="px-4 py-3">{c.description || "-"}</td>
                      <td className="px-4 py-3 text-right font-mono text-success whitespace-nowrap">+{CURRENCY_SYMBOL[c.currency] ?? "$"}{Number(c.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-string-muted">{CURRENCY_SYMBOL[c.currency] ?? "$"} {c.currency || "MXN"}</td>
                      <td className="px-4 py-3">{card ? <span className="inline-flex items-center gap-1 text-xs bg-surface-alt px-2 py-0.5 rounded">{cardEmoji(card.type)} {card.name}</span> : "-"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button data-edit-cashback={c.id} className="text-primary hover:text-primary-hover text-xs font-medium cursor-pointer">{BTN_EDIT(t)}</button>
                        <button data-delete-cashback={c.id} className="text-danger hover:text-danger-hover text-xs font-medium cursor-pointer">{BTN_DELETE(t)}</button>
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

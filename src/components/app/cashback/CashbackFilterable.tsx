import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import type { Cashback } from "@/lib/types/cashback.ts";
import { formatDate } from "@/lib/date.ts";
import { FILTER_WRAP_CLASS, FILTER_INPUT_CLASS, FILTER_LIMPIAR_CLASS, FILTER_GRID_CLASS, FILTER_CTA_CLASS, BTN_CLEAR, FILTER_ALL_CARDS, FILTER_ALL_MONTHS, FILTER_SEARCH_DESC, FILTER_LABEL_CARD } from "@/lib/filter-fields.ts";
import { BTN_EDIT, BTN_DELETE, CURRENCY_SYMBOL } from "@/lib/general-fields.ts";
import { labels } from "@/lib/labels.ts";

interface Props {
  initialMonth: string;
  cards: { id: string; name: string; type: string }[];
  initialData?: string;
  createdAt?: string;
}

const cardEmoji = (type: string) => type === "credit" ? "💳" : type === "debit" ? "🏦" : "🎫";

export default function CashbackFilterable({ initialMonth, cards, initialData, createdAt }: Props) {
  const parsedInitial = initialData ? JSON.parse(initialData) as Cashback[] : undefined;
  const { filters, setFilter, clearFilters, data, loading, error } = useFilteredData<Cashback[]>("/api/cashback", {
    ...(initialMonth ? { month: initialMonth } : {}),
  }, parsedInitial);

  const items = data ?? [];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text" role="alert">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className={FILTER_GRID_CLASS}>
          <div className={FILTER_WRAP_CLASS}>
            <MonthSelector value={filters.month || initialMonth} onChange={(m) => setFilter("month", m)} createdAt={createdAt} allLabel={FILTER_ALL_MONTHS} />
          </div>
          <div className={FILTER_WRAP_CLASS}>
            <Select
              value={filters.card_id || ""}
              onChange={(v) => setFilter("card_id", v)}
              options={[{ value: "", label: FILTER_ALL_CARDS }, ...cards.map(c => ({ value: c.id, label: `${cardEmoji(c.type)} ${c.name}` }))]}
              placeholder={FILTER_LABEL_CARD}
              ariaLabel={FILTER_LABEL_CARD}
            />
          </div>
          <input
            type="search"
            data-search-input
            defaultValue={filters.q || ""}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder={FILTER_SEARCH_DESC}
            className={FILTER_INPUT_CLASS}
          />
          <button onClick={clearFilters} className={FILTER_LIMPIAR_CLASS}>{BTN_CLEAR}</button>
        </div>
        <button data-create="cashback" className={FILTER_CTA_CLASS}>{labels.cta.newCashback}</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        {loading ? (
          <div className="p-4 text-center text-string-muted text-sm">{labels.common.loading}</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-string-muted text-sm">{labels.empty.cashback}</div>
        ) : (
          <table className="w-full text-sm" aria-label={labels.page.cashback}>
            <thead>
              <tr className="text-xs uppercase text-string-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium">{labels.table.date}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.description}</th>
                <th className="text-right px-4 py-3 font-medium">{labels.table.amount}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.currency}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.card}</th>
                <th className="text-right px-4 py-3 font-medium">{labels.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => {
                const card = cards.find(ca => ca.id === c.card_id);
                return (
                  <tr key={c.id} className="hover:bg-nav-hover border-b border-border/50">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatDate(c.date)}</td>
                    <td className="px-4 py-3">{c.description || "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-success whitespace-nowrap">+{CURRENCY_SYMBOL[c.currency] ?? "$"}{Number(c.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-string-muted">{CURRENCY_SYMBOL[c.currency] ?? "$"} {c.currency || "MXN"}</td>
                    <td className="px-4 py-3">{card ? <span className="inline-flex items-center gap-1 text-xs bg-surface-alt px-2 py-0.5 rounded">{cardEmoji(card.type)} {card.name}</span> : "-"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      <button data-edit-cashback={c.id} className="text-primary hover:text-primary-hover text-xs font-medium cursor-pointer">{BTN_EDIT}</button>
                      <button data-delete-cashback={c.id} className="text-danger hover:text-danger-hover text-xs font-medium cursor-pointer">{BTN_DELETE}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import type { Transaction } from "@/lib/types/transaction.ts";
import { formatDate } from "@/lib/date.ts";
import { FILTER_WRAP_CLASS, FILTER_INPUT_CLASS, FILTER_LIMPIAR_CLASS, FILTER_GRID_CLASS, FILTER_CTA_CLASS, BTN_CLEAR, FILTER_ALL_TYPES, FILTER_ALL_CATEGORIES, FILTER_ALL_PAYMENT_METHODS, FILTER_ALL_MONTHS, FILTER_SEARCH_DESC, FILTER_LABEL_TYPE, FILTER_LABEL_CATEGORY, FILTER_LABEL_PAYMENT_METHOD } from "@/lib/filter-fields.ts";
import { BTN_EDIT, BTN_DELETE, CURRENCY_SYMBOL } from "@/lib/general-fields.ts";
import { labels } from "@/lib/labels.ts";

interface Props {
  initialMonth: string;
  filterType: string;
  paymentMethods: { id: string; icon: string | null; name: string }[];
  categories: { id: string; icon: string | null; name: string }[];
  initialData?: string;
  createdAt?: string;
}

export default function TransactionsFilterable({ initialMonth, filterType: initialType, paymentMethods, categories, initialData, createdAt }: Props) {
  const parsedInitial = initialData ? JSON.parse(initialData) as Transaction[] : undefined;
  const { filters, setFilter, clearFilters, data, loading, error } = useFilteredData<Transaction[]>("/api/transactions", {
    ...(initialType !== "all" ? { type: initialType } : {}),
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
            <MonthSelector value={filters.month || ""} onChange={(m) => setFilter("month", m)} createdAt={createdAt} allLabel={FILTER_ALL_MONTHS} />
          </div>
          <div className={FILTER_WRAP_CLASS}>
            <Select
              value={filters.type || ""}
              onChange={(v) => setFilter("type", v)}
              options={[
                { value: "", label: FILTER_ALL_TYPES },
                { value: "income", label: labels.filter.income },
                { value: "expense", label: labels.filter.expense },
              ]}
              placeholder={FILTER_LABEL_TYPE}
              ariaLabel={FILTER_LABEL_TYPE}
            />
          </div>
          <div className={FILTER_WRAP_CLASS}>
            <Select
              value={filters.payment_method_id || ""}
              onChange={(v) => setFilter("payment_method_id", v)}
              options={[{ value: "", label: FILTER_ALL_PAYMENT_METHODS }, ...paymentMethods.map(pm => ({ value: pm.id, label: `${pm.icon || "💳"} ${pm.name}` }))]}
              placeholder={FILTER_LABEL_PAYMENT_METHOD}
              ariaLabel={FILTER_LABEL_PAYMENT_METHOD}
            />
          </div>
          <div className={FILTER_WRAP_CLASS}>
            <Select
              value={filters.category_id || ""}
              onChange={(v) => setFilter("category_id", v)}
              options={[{ value: "", label: FILTER_ALL_CATEGORIES }, ...categories.map(c => ({ value: c.id, label: `${c.icon || "📂"} ${c.name}` }))]}
              placeholder={FILTER_LABEL_CATEGORY}
              ariaLabel={FILTER_LABEL_CATEGORY}
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
        <button data-create="transactions" className={FILTER_CTA_CLASS}>{labels.cta.newTransaction}</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        {loading ? (
          <div className="p-4 text-center text-string-muted text-sm">{labels.common.loading}</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-string-muted text-sm">{labels.empty.transactions}</div>
        ) : (
          <table className="w-full text-sm" aria-label={labels.page.transactions}>
            <thead>
              <tr className="text-xs uppercase text-string-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium">{labels.table.date}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.description}</th>
                <th className="text-right px-4 py-3 font-medium">{labels.table.amount}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.currency}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.method}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.type}</th>
                <th className="text-left px-4 py-3 font-medium">{labels.table.category}</th>
                <th className="text-right px-4 py-3 font-medium">{labels.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(tx => {
                const pm = paymentMethods.find(p => p.id === tx.payment_method_id);
                const cat = categories.find(c => c.id === tx.category_id);
                return (
                  <tr key={tx.id} className="hover:bg-nav-hover border-b border-border/50">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">{tx.description || "-"}</td>
                    <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${tx.type === "income" ? "text-success" : "text-danger"}`}>
                      {CURRENCY_SYMBOL[tx.currency] ?? "$"}{Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-string-muted">{CURRENCY_SYMBOL[tx.currency] ?? "$"} {tx.currency || "MXN"}</td>
                    <td className="px-4 py-3">{pm ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{pm.icon || "💳"} {pm.name}</span> : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${tx.type === "income" ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text"}`}>
                        {tx.type === "income" ? labels.badge.income : labels.badge.expense}
                      </span>
                    </td>
                    <td className="px-4 py-3">{cat ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{cat.icon || "📂"} {cat.name}</span> : "-"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      <button data-edit-transactions={tx.id} className="text-primary hover:text-primary-hover text-xs font-medium cursor-pointer">{BTN_EDIT}</button>
                      <button data-delete-transactions={tx.id} className="text-danger hover:text-danger-hover text-xs font-medium cursor-pointer">{BTN_DELETE}</button>
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

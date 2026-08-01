import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import type { Transaction } from "@/lib/types/transaction.ts";
import { formatDate } from "@/lib/date.ts";
import { FILTER_WRAP_CLASS, FILTER_INPUT_CLASS, FILTER_LIMPIAR_CLASS, FILTER_GRID_CLASS, FILTER_CTA_CLASS, BTN_CLEAR, FILTER_ALL, FILTER_ALL_CATEGORIES, FILTER_ALL_PAYMENT_METHODS, FILTER_ALL_MONTHS, FILTER_SEARCH_DESC, FILTER_LABEL_TYPE, FILTER_LABEL_CATEGORY, FILTER_LABEL_PAYMENT_METHOD } from "@/lib/filter-fields.ts";
import { BTN_EDIT, BTN_DELETE } from "@/lib/general-fields.ts";

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
  const { filters, setFilter, clearFilters, data, loading } = useFilteredData<Transaction[]>("/api/transactions", {
    ...(initialType !== "all" ? { type: initialType } : {}),
    ...(initialMonth ? { month: initialMonth } : {}),
  }, parsedInitial);

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className={FILTER_GRID_CLASS}>
          <div className={FILTER_WRAP_CLASS}>
            <Select
              value={filters.type || ""}
              onChange={(v) => setFilter("type", v)}
              options={[
                { value: "", label: FILTER_ALL },
                { value: "income", label: "Ingresos" },
                { value: "expense", label: "Gastos" },
              ]}
              placeholder={FILTER_LABEL_TYPE}
              ariaLabel={FILTER_LABEL_TYPE}
            />
          </div>
          <div className={FILTER_WRAP_CLASS}>
            <MonthSelector value={filters.month || ""} onChange={(m) => setFilter("month", m)} createdAt={createdAt} allLabel={FILTER_ALL_MONTHS} />
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
        <button data-create="transactions" className={FILTER_CTA_CLASS}>Nueva transacción</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        {loading ? (
          <div className="p-4 text-center text-string-muted text-sm">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-string-muted text-sm">Sin transacciones</div>
        ) : (
          <table className="w-full text-sm" aria-label="Transacciones">
            <thead>
              <tr className="text-xs uppercase text-string-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Descripción</th>
                <th className="text-right px-4 py-3 font-medium">Monto</th>
                <th className="text-left px-4 py-3 font-medium">Moneda</th>
                <th className="text-left px-4 py-3 font-medium">Método</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
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
                      {tx.currency === "EUR" ? "€" : "$"}{Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-string-muted">{(tx.currency === "EUR" ? "€" : "$")} {tx.currency || "MXN"}</td>
                    <td className="px-4 py-3">{pm ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{pm.icon || "💳"} {pm.name}</span> : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${tx.type === "income" ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text"}`}>
                        {tx.type === "income" ? "Ingreso" : "Gasto"}
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

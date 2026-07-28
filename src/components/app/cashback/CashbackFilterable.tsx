import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import type { Cashback } from "@/lib/types/cashback.ts";
import { FILTER_LIMPIAR_TEXT, BTN_EDIT_TEXT, BTN_DELETE_TEXT, LOADING_TEXT } from "@/lib/form-fields.ts";


interface Props {
  initialMonth: string;
  cards: { id: string; name: string; type: string }[];
  initialData?: string;
}

const cardEmoji = (type: string) => type === "credit" ? "💳" : type === "debit" ? "🏦" : "🎫";

export default function CashbackFilterable({ initialMonth, cards, initialData }: Props) {
  const parsedInitial = initialData ? JSON.parse(initialData) as Cashback[] : undefined;
  const { filters, setFilter, clearFilters, data, loading } = useFilteredData<Cashback[]>("/api/cashback", {
    month: initialMonth,
  }, parsedInitial);

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:items-end sm:flex-1">
          <div className="w-full sm:w-48">
            <MonthSelector value={filters.month || initialMonth} onChange={(m) => setFilter("month", m)} />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={filters.card_id || ""}
              onChange={(v) => setFilter("card_id", v)}
              options={[{ value: "", label: "Todas las tarjetas" }, ...cards.map(c => ({ value: c.id, label: `${cardEmoji(c.type)} ${c.name}` }))]}
              placeholder="Tarjeta"
              ariaLabel="Tarjeta"
            />
          </div>
          <input
            type="search"
            data-search-input
            defaultValue={filters.q || ""}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Buscar por descripción..."
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-string w-full col-span-2 sm:w-48 sm:col-span-1"
          />
           <button onClick={clearFilters} className="w-full col-span-2 sm:col-span-1 sm:w-auto px-3 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-danger hover:bg-danger-bg cursor-pointer">{FILTER_LIMPIAR_TEXT}</button>
        </div>
        <button data-create="cashback" className="hidden sm:block sm:shrink-0 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover cursor-pointer">Nuevo cashback</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        {loading ? (
          <div className="p-4 text-center text-string-muted text-sm">{LOADING_TEXT}</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-string-muted text-sm">Sin cashback</div>
        ) : (
          <table className="w-full text-sm" aria-label="Cashback">
            <thead>
              <tr className="text-xs uppercase text-string-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Descripción</th>
                <th className="text-right px-4 py-3 font-medium">Monto</th>
                <th className="text-left px-4 py-3 font-medium">Moneda</th>
                <th className="text-left px-4 py-3 font-medium">Tarjeta</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => {
                const card = cards.find(ca => ca.id === c.card_id);
                return (
                  <tr key={c.id} className="hover:bg-nav-hover border-b border-border/50">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{new Date(c.date).toLocaleDateString("es")}</td>
                    <td className="px-4 py-3">{c.description || "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-success whitespace-nowrap">+{(c.currency === "EUR" ? "€" : "$")}{Number(c.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-string-muted">{(c.currency === "EUR" ? "€" : "$")} {c.currency || "MXN"}</td>
                    <td className="px-4 py-3">{card ? <span className="inline-flex items-center gap-1 text-xs bg-surface-alt px-2 py-0.5 rounded">{cardEmoji(card.type)} {card.name}</span> : "-"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      <button data-edit-cashback={c.id} className="text-primary hover:text-primary-hover text-xs font-medium cursor-pointer">{BTN_EDIT_TEXT}</button>
                      <button data-delete-cashback={c.id} className="text-danger hover:text-danger-hover text-xs font-medium cursor-pointer">{BTN_DELETE_TEXT}</button>
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

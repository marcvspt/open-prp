import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";
import { monthLabel } from "@/lib/date.ts";
import { CURRENCY_SYMBOL } from "@/lib/form-fields.ts";

interface Props {
  initialData: string;
  categories: string;
  createdAt?: string;
}

export default function RecurringPaymentsHistory({ initialData, categories, createdAt }: Props) {
  const parsedInitial = JSON.parse(initialData) as RecurringPaymentMonthly[];
  const catMap = JSON.parse(categories) as Record<string, { icon: string | null; name: string }>;
  const { filters, setFilter, data, loading } = useFilteredData<RecurringPaymentMonthly[]>("/api/recurring-payment-monthly/history", {}, parsedInitial);

  const items = data ?? [];

  return (
    <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-string">Historial de pagos recurrentes</h2>
        <div className="w-48">
          <MonthSelector value={filters.month || ""} onChange={(m) => setFilter("month", m)} createdAt={createdAt} allLabel="Último año" />
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-string-muted">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-string-muted">Sin datos históricos</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-string-muted text-xs uppercase border-b border-border">
                <th className="text-left px-3 py-2">Mes</th>
                <th className="text-left px-3 py-2">Descripción</th>
                <th className="text-right px-3 py-2">Monto</th>
                <th className="text-center px-3 py-2">Tipo</th>
                <th className="text-center px-3 py-2">Moneda</th>
                <th className="text-center px-3 py-2">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sp, i) => {
                const cat = sp.category_id ? catMap[sp.category_id] : null;
                return (
                  <tr key={`${sp.month}-${sp.payment_id}-${i}`} className="border-b border-border/50">
                    <td className="px-3 py-2 text-string-muted">{monthLabel(sp.month)}</td>
                    <td className="px-3 py-2 font-medium text-string">{sp.name ?? "?"}</td>
                    <td className={`px-3 py-2 text-right font-mono ${sp.type === "income" ? "text-success" : "text-danger"}`}>
                      {sp.type === "income" ? "+" : "-"}{CURRENCY_SYMBOL[sp.currency || "MXN"] || "$"}{Number(sp.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${sp.type === "income" ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text"}`}>
                        {sp.type === "income" ? "Ingreso" : "Gasto"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-string-muted">{CURRENCY_SYMBOL[sp.currency || "MXN"] || "$"} {sp.currency || "MXN"}</td>
                    <td className="px-3 py-2 text-center">
                      {cat ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{cat.icon || "📂"} {cat.name}</span> : <span className="text-xs text-string-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

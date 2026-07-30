import { useState, useEffect, useRef } from "react";
import { fetchList } from "@/lib/safeFetch.ts";
import { monthLabel } from "@/lib/date.ts";
import { formatCurrency } from "@/lib/format.ts";
import type { CardMonthly } from "@/lib/types/card-monthly.ts";
import type { Card } from "@/lib/types/card.ts";

interface Props {
  initialData: string;
  initialCards: string;
}

export default function CardsHistory({ initialData, initialCards }: Props) {
  const cards: Card[] = JSON.parse(initialCards);
  const [items, setItems] = useState<CardMonthly[]>(() => JSON.parse(initialData));
  const [loading, setLoading] = useState(false);
  const loadedQsRef = useRef("");

  useEffect(() => {
    function fetchHistory() {
      const month = new URLSearchParams(location.search).get("month");
      const url = month && /^\d{4}-\d{2}$/.test(month)
        ? `/api/card-monthly/history?month=${month}`
        : "/api/card-monthly/history";
      const qs = new URLSearchParams(location.search).toString();
      if (qs === loadedQsRef.current) return;
      loadedQsRef.current = qs;
      setLoading(true);
      fetchList<CardMonthly>(url)
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
    <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
      <h2 className="text-base font-semibold text-string mb-3">Historial de tarjetas</h2>
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
                <th className="text-left px-3 py-2">Tarjeta</th>
                <th className="text-right px-3 py-2">Deuda</th>
                <th className="text-center px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d, i) => {
                const card = cards.find(c => c.id === d.card_id);
                return (
                  <tr key={`${d.month}-${d.card_id}-${i}`} className="border-b border-border/50">
                    <td className="px-3 py-2 text-string-muted">{monthLabel(d.month)}</td>
                    <td className="px-3 py-2 font-medium text-string">{card?.name ?? "?"}</td>
                    <td className="px-3 py-2 text-right font-mono text-string">{formatCurrency(d.statement_balance)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.is_paid ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text"}`}>
                        {d.is_paid ? "Pagado" : "Pendiente"}
                      </span>
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

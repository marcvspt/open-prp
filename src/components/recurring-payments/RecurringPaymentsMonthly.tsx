import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/astro/react";
import { safeFetch } from "@/lib/safeFetch.ts";
import type { RecurringPaymentMonthly, RecurringPayment } from "@/lib/types/recurring-payment.ts";
import MonthSelector from "@/components/ui/MonthSelector.tsx";

export default function RecurringPaymentsMonthly() {
  const { userId } = useAuth();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(() => typeof location !== "undefined" ? new URLSearchParams(location.search).get("month") || currentMonth : currentMonth);

  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [monthly, setMonthly] = useState<RecurringPaymentMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (selectedMonth !== currentMonth) params.set("month", selectedMonth);
    else params.delete("month");
    const qs = params.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }, [selectedMonth, currentMonth]);

  const handleMonthChange = (month: string) => setSelectedMonth(month);

  const fetchMonthly = useCallback(async () => {
    const data = await safeFetch<RecurringPaymentMonthly[]>(
      `/api/recurring-payment-monthly?month=${selectedMonth}`
    );
    if (data) setMonthly(data);
  }, [selectedMonth]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([
        (async () => {
          const data = await safeFetch<RecurringPayment[]>("/api/recurring-payments");
          if (data) setPayments(data);
        })(),
        fetchMonthly(),
      ]);
    } catch {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [fetchMonthly]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTogglePaid = async (paymentId: string) => {
    setTogglingId(paymentId);
    const m = monthly.find(sm => sm.payment_id === paymentId);
    if (!m) return;
    const ok = await safeFetch(`/api/recurring-payment-monthly?id=${m.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_paid: !m.is_paid }),
    });
    if (ok) fetchMonthly();
    setTogglingId(null);
  };

  const handleRemoveFromMonth = async (paymentId: string) => {
    const m = monthly.find(sm => sm.payment_id === paymentId);
    if (!m) return;
    const ok = await safeFetch(`/api/recurring-payment-monthly?id=${m.id}`, {
      method: "DELETE",
    });
    if (ok) fetchMonthly();
  };

  const handleAddToMonth = async (payment: RecurringPayment) => {
    const ok = await safeFetch(`/api/recurring-payments/${payment.id}/monthly`, {
      method: "POST",
      body: JSON.stringify({
        month: selectedMonth,
        amount: payment.default_amount,
      }),
    });
    if (ok) fetchMonthly();
  };

  const toggleCategory = (name: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading) return <div className="p-4 text-text-muted">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const monthlyMap = new Map(monthly.map(sm => [sm.payment_id, sm]));
  const categories = [...new Set(payments.map(p => p.category_name ?? "Sin categoría"))];

  const totalAmount = monthly.reduce((sum, sm) => sum + sm.amount, 0);
  const paid = monthly.filter(sm => sm.is_paid);
  const unpaid = monthly.filter(sm => !sm.is_paid);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MonthSelector
          value={selectedMonth}
          onChange={handleMonthChange}
        />
      </div>

      {monthly.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-text-muted mb-1">Total</div>
            <div className="text-lg font-semibold text-red-600">${totalAmount.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-text-muted mb-1">Pagados</div>
            <div className="text-lg font-semibold text-green-600">{paid.length}/{monthly.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-text-muted mb-1">Pendiente</div>
            <div className="text-lg font-semibold text-yellow-600">${unpaid.reduce((s, sm) => s + sm.amount, 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-text-muted text-sm">No hay pagos recurrentes registrados.</div>
      ) : (
        <div className="space-y-6">
          {categories.map(category => {
            const filtered = payments.filter(p => (p.category_name ?? "Sin categoría") === category);
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2 hover:text-text transition-colors"
                >
                  <span className={`transition-transform ${collapsedCategories.has(category) ? "" : "rotate-90"}`}>
                    ▶
                  </span>
                  {category}
                </button>
                {!collapsedCategories.has(category) && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {filtered.map(payment => {
                      const entry = monthlyMap.get(payment.id);
                      const isAdded = !!entry;
                      const isPaid = entry?.is_paid ?? false;
                      return (
                        <div key={payment.id}
                          className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                            isPaid
                              ? "border-green-500/30 bg-green-500/5"
                              : isAdded
                                ? "border-indigo-400/40 bg-indigo-500/5"
                                : "border-border bg-panel hover:border-indigo-400/40 hover:shadow-sm"
                          }`}
                        >
                          {isAdded && !isPaid && (
                            <button
                              onClick={() => handleRemoveFromMonth(payment.id)}
                              className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-xs text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                              title="Quitar del mes"
                            >
                              ✕
                            </button>
                          )}
                          <div className="space-y-2">
                            <div className={`font-medium text-sm leading-tight ${isPaid ? "line-through text-text-muted" : "text-text"}`}>
                              {payment.name}
                            </div>
                            <div className={`text-lg font-semibold ${isPaid ? "text-green-600 line-through" : "text-red-600"}`}>
                              ${(entry?.amount ?? payment.default_amount).toLocaleString()}
                            </div>
                            {payment.payment_method_name && (
                              <div className="text-xs text-text-muted">
                                {payment.payment_method_icon || "💳"} {payment.payment_method_name}
                              </div>
                            )}
                          </div>
                          {isPaid ? (
                            <div className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-green-100 text-green-700 text-center">
                              Pagado
                            </div>
                          ) : isAdded ? (
                            <button
                              onClick={() => handleTogglePaid(payment.id)}
                              disabled={togglingId === payment.id}
                              className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {togglingId === payment.id ? "..." : "Marcar como pagado"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddToMonth(payment)}
                              className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
                            >
                              Agregar al mes
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
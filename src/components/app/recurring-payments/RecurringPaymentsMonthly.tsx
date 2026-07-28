import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/astro/react";
import { safeFetch } from "@/lib/safeFetch.ts";
import type { RecurringPaymentMonthly, RecurringPayment } from "@/lib/types/recurring-payment.ts";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";

type PaymentType = "income" | "expense";

interface Props {
  createdAt?: string;
}

export default function RecurringPaymentsMonthly({ createdAt }: Props) {
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
    history.replaceState(null, "", (qs ? "?" + qs : location.pathname) + location.hash);
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

  const monthlyMap = new Map(monthly.map(sm => [sm.payment_id, sm]));

  function renderPaymentCard(payment: RecurringPayment) {
    const entry = monthlyMap.get(payment.id);
    const isAdded = !!entry;
    const isPaid = entry?.is_paid ?? false;
    const isIncome = payment.type === "income";
    const amount = entry?.amount ?? payment.default_amount;
    const textColor = isIncome ? "text-success" : "text-danger";

    return (
      <div key={payment.id}
        className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
          isPaid
            ? "border-success/30 bg-success/5"
            : isAdded
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-panel hover:border-primary/40 hover:shadow-sm"
        }`}
      >
        {isAdded && !isPaid && (
          <button
            onClick={() => handleRemoveFromMonth(payment.id)}
            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-xs text-string-muted hover:text-danger hover:bg-danger/10 rounded transition-colors cursor-pointer"
            title="Quitar del mes"
          >
            ✕
          </button>
        )}
        <div className="space-y-2">
          <div className={`font-medium text-sm leading-tight ${isPaid ? "text-string-muted" : "text-string"}`}>
            {payment.name}
          </div>
          <div className={`text-lg font-semibold ${isPaid ? "text-string-muted" : textColor}`}>
            {isIncome ? "+" : "-"}${amount.toLocaleString()}
          </div>
          {payment.payment_method_name && (
            <div className="text-xs text-string-muted">
              {payment.payment_method_icon || "💳"} {payment.payment_method_name}
            </div>
          )}
        </div>
        {isPaid ? (
          <div className={`mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-success-bg text-success-text text-center`}>
            {isIncome ? "Recibido" : "Pagado"}
          </div>
        ) : isAdded ? (
          <button
            onClick={() => handleTogglePaid(payment.id)}
            disabled={togglingId === payment.id}
            className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-all disabled:opacity-50 cursor-pointer"
          >
            {togglingId === payment.id ? "..." : isIncome ? "Marcar como recibido" : "Marcar como pagado"}
          </button>
        ) : (
          <button
            onClick={() => handleAddToMonth(payment)}
            className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-all cursor-pointer"
          >
            Agregar al mes
          </button>
        )}
      </div>
    );
  }

  function renderTypeSection(type: PaymentType, label: string, colorClass: string, icon: string) {
    const filtered = payments.filter(p => p.type === type);
    if (filtered.length === 0) return null;

    const typeMonthly = monthly.filter(sm => sm.type === type);
    const typeTotal = typeMonthly.reduce((s, sm) => s + sm.amount, 0);
    const typeReceived = typeMonthly.filter(sm => sm.is_paid);
    const typePending = typeMonthly.filter(sm => !sm.is_paid);

    const categories = [...new Set(filtered.map(p => p.category_name ?? "Sin categoría"))];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className={`text-base font-semibold ${colorClass}`}>{icon} {label}</h3>
        </div>
        {typeMonthly.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-panel border border-border text-center">
              <div className="text-xs text-string-muted mb-1">Total</div>
              <div className={`text-lg font-semibold ${colorClass}`}>
                ${typeTotal.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-panel border border-border text-center">
              <div className="text-xs text-string-muted mb-1">{type === "income" ? "Recibidos" : "Pagados"}</div>
              <div className="text-lg font-semibold text-success">{typeReceived.length}/{typeMonthly.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-panel border border-border text-center">
              <div className="text-xs text-string-muted mb-1">Pendiente</div>
              <div className="text-lg font-semibold text-warning">
                ${typePending.reduce((s, sm) => s + sm.amount, 0).toLocaleString()}
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {categories.map(category => {
            const catFiltered = filtered.filter(p => (p.category_name ?? "Sin categoría") === category);
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 text-sm font-medium text-string-muted mb-2 hover:text-string transition-colors"
                >
                  <span className={`transition-transform ${collapsedCategories.has(category) ? "" : "rotate-90"}`}>
                    ▶
                  </span>
                  {category}
                </button>
                {!collapsedCategories.has(category) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {catFiltered.map(renderPaymentCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-4 text-string-muted">Cargando...</div>;
  if (error) return <div className="p-4 text-danger">Error: {error}</div>;

  const incomeTotal = monthly.filter(sm => sm.type === "income").reduce((s, sm) => s + sm.amount, 0);
  const expenseTotal = monthly.filter(sm => sm.type === "expense").reduce((s, sm) => s + sm.amount, 0);
  const netTotal = incomeTotal - expenseTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MonthSelector
          value={selectedMonth}
          onChange={handleMonthChange}
          createdAt={createdAt}
        />
      </div>

      {monthly.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">Ingresos</div>
            <div className="text-lg font-semibold text-success">${incomeTotal.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">Gastos</div>
            <div className="text-lg font-semibold text-danger">${expenseTotal.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">Balance</div>
            <div className={`text-lg font-semibold ${netTotal >= 0 ? "text-success" : "text-danger"}`}>
              ${netTotal.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-panel border border-border text-center">
            <div className="text-xs text-string-muted mb-1">Movimientos</div>
            <div className="text-lg font-semibold text-primary">{monthly.length}</div>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-string-muted text-sm">No hay pagos recurrentes registrados.</div>
      ) : (
        <div className="space-y-8">
          {renderTypeSection("income", "Ingresos", "text-success", "💵")}
          {renderTypeSection("expense", "Gastos", "text-danger", "💰")}
        </div>
      )}
    </div>
  );
}
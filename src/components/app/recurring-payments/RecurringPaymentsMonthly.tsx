import { useState, useCallback } from "react";
import { safeFetch } from "@/lib/safeFetch.ts";
import type { RecurringPaymentMonthly, RecurringPayment } from "@/lib/types/recurring-payment.ts";

type PaymentType = "income" | "expense";

interface Props {
  initialMonth: string;
  initialPayments: string;
  initialMonthly: string;
}

export default function RecurringPaymentsMonthly({ initialMonth, initialPayments, initialMonthly }: Props) {
  const [payments] = useState<RecurringPayment[]>(() => JSON.parse(initialPayments));
  const [monthly, setMonthly] = useState<RecurringPaymentMonthly[]>(() => JSON.parse(initialMonthly));
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const fetchMonthly = useCallback(async () => {
    const data = await safeFetch<RecurringPaymentMonthly[]>(
      `/api/recurring-payment-monthly?month=${initialMonth}`
    );
    if (data) setMonthly(data);
  }, [initialMonth]);

  async function togglePaid(monthlyItem: RecurringPaymentMonthly) {
    setTogglingId(monthlyItem.id);
    const ok = await safeFetch(`/api/recurring-payment-monthly`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: monthlyItem.id, is_paid: !monthlyItem.is_paid }),
    });
    if (ok) await fetchMonthly();
    setTogglingId(null);
  }

  function toggleCategory(catId: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  const categories = groupByCategory(payments, monthly);
  const hasIncome = categories.some(c => c.type === "income" && c.items.length > 0);
  const hasExpense = categories.some(c => c.type === "expense" && c.items.length > 0);

  return (
    <div>
      <div className="space-y-6">
        {hasIncome && (
          <div>
            <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
              <span>Ingresos recurrentes</span>
            </h3>
            <div className="space-y-2">
              {categories.filter(c => c.type === "income").map(cat => renderCategoryGroup(cat))}
            </div>
          </div>
        )}
        {hasExpense && (
          <div>
            <h3 className="text-sm font-semibold text-danger mb-3 flex items-center gap-2">
              <span>Gastos recurrentes</span>
            </h3>
            <div className="space-y-2">
              {categories.filter(c => c.type === "expense").map(cat => renderCategoryGroup(cat))}
            </div>
          </div>
        )}
      </div>

      {(!hasIncome && !hasExpense) && (
        <p className="text-sm text-string-muted">Sin movimientos este mes</p>
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <span className="text-xs text-string-muted">Cargando...</span>
        </div>
      )}
    </div>
  );

  function renderCategoryGroup(group: { type: PaymentType; categoryName: string; categoryId: string | null; items: RecurringPaymentMonthly[] }) {
    const catKey = group.categoryId ?? "__uncategorized";
    const isCollapsed = collapsedCategories.has(catKey);
    const total = group.items.reduce((sum, item) => {
      const payment = payments.find(p => p.id === item.payment_id);
      return sum + Number(payment?.default_amount ?? item.amount ?? 0);
    }, 0);

    return (
      <div key={catKey} className="bg-panel rounded-xl border border-border overflow-hidden shadow-sm">
        <button
          onClick={() => toggleCategory(catKey)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-string hover:bg-nav-hover transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <svg className={`w-3 h-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            {group.categoryName}
          </span>
          <span className={`text-xs font-mono ${group.type === "income" ? "text-success" : "text-danger"}`}>
            {group.type === "income" ? "+" : "-"}${total.toFixed(2)}
          </span>
        </button>
        {!isCollapsed && (
          <div className="divide-y divide-border/50">
            {group.items.map(item => {
              const payment = payments.find(p => p.id === item.payment_id);
              return (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => togglePaid(item)}
                      disabled={togglingId === item.id}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                        item.is_paid
                          ? "bg-success border-success"
                          : "border-border hover:border-primary"
                      }`}
                      aria-label={item.is_paid ? "Marcar como no pagado" : "Marcar como pagado"}
                    >
                      {item.is_paid && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <span className={`truncate ${item.is_paid ? "line-through text-string-muted" : "text-string"}`}>
                      {payment?.name ?? "?"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-mono text-xs ${group.type === "income" ? "text-success" : "text-danger"}`}>
                      {group.type === "income" ? "+" : "-"}${Number(item.amount ?? payment?.default_amount ?? 0).toFixed(2)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.is_paid
                        ? "bg-success-bg text-success-text"
                        : "bg-warning-bg text-warning-text"
                    }`}>
                      {item.is_paid ? "Pagado" : "Pendiente"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

interface GroupedCategory {
  type: PaymentType;
  categoryName: string;
  categoryId: string | null;
  items: RecurringPaymentMonthly[];
}

function groupByCategory(payments: RecurringPayment[], monthly: RecurringPaymentMonthly[]): GroupedCategory[] {
  const groups = new Map<string, GroupedCategory>();

  for (const item of monthly) {
    const payment = payments.find(p => p.id === item.payment_id);
    if (!payment) continue;
    const catId = payment.category_id ?? "__uncategorized";
    const catName = payment.category_name ?? "Sin categoría";

    if (!groups.has(catId)) {
      groups.set(catId, { type: payment.type, categoryName: catName, categoryId: payment.category_id, items: [] });
    }
    groups.get(catId)!.items.push(item);
  }

  return Array.from(groups.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

import { useState, useEffect, useCallback, useMemo } from "react";
import type { CreditCard } from "@/lib/types/credit-card.ts";
import type { CardMonthly, CalculatedDebt } from "@/lib/types/card-monthly.ts";
import type { RecurringPaymentMonthly, RecurringPayment } from "@/lib/types/recurring-payment.ts";
import type { Transaction } from "@/lib/types/transaction.ts";
import type { Cashback } from "@/lib/types/cashback.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { Event as AppEvent } from "@/lib/types/event.ts";
import type { Task } from "@/lib/types/task.ts";
import type { ShoppingItem } from "@/lib/types/shopping.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";
import { getMonthOptions, monthLabel, lastDayOfMonth, isInstallmentInMonth, daysUntil } from "@/lib/date.ts";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";

interface CardWithDebt extends CreditCard {
  debt?: CardMonthly;
}

function dueDaysBorder(days: number): string {
  if (days <= 0) return "border-border";
  if (days <= 3) return "border-danger";
  if (days <= 8) return "border-warning";
  return "border-success";
}

function dueDaysBadge(days: number): string {
  if (days <= 0) return "bg-nav-hover text-string-muted";
  if (days <= 3) return "bg-danger-bg text-danger-text";
  if (days <= 8) return "bg-warning-bg text-warning-text";
  return "bg-success-bg text-success-text";
}

function formatCurrency(n: number): string {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
}

export default function DashboardContent() {
  const months = useMemo(() => getMonthOptions(), []);
  const defaultMonth = months[0];
  const defaultTab = "resumen";

  const [activeTab, setActiveTab] = useState(() => typeof location !== "undefined" ? location.hash.replace("#", "") || defaultTab : defaultTab);
  const [currentMonth, setCurrentMonth] = useState(() => typeof location !== "undefined" ? new URLSearchParams(location.search).get("month") || defaultMonth : defaultMonth);
  const [cards, setCards] = useState<CardWithDebt[]>([]);
  const [services, setServices] = useState<RecurringPayment[]>([]);
  const [cardDebts, setCardDebts] = useState<CardMonthly[]>([]);
  const [servicePayments, setServicePayments] = useState<RecurringPaymentMonthly[]>([]);
  const [historyCard, setHistoryCard] = useState<CardMonthly[]>([]);
  const [historyService, setHistoryService] = useState<RecurringPaymentMonthly[]>([]);
  const [txData, setTxData] = useState({ incomes: 0, expenses: 0, recentTx: [] as Transaction[] });
  const [installmentTotal, setInstallmentTotal] = useState(0);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [calculatedDebts, setCalculatedDebts] = useState<Record<string, CalculatedDebt>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<AppEvent[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [activeShopping, setActiveShopping] = useState<ShoppingItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payDialog, setPayDialog] = useState<{ debt: CardMonthly; card: CardWithDebt } | null>(null);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (currentMonth !== defaultMonth) params.set("month", currentMonth);
    else params.delete("month");
    const qs = params.toString();
    const hash = activeTab !== defaultTab ? `#${activeTab}` : "";
    history.replaceState(null, "", (qs ? "?" + qs : location.pathname) + hash);
  }, [activeTab, currentMonth, defaultTab, defaultMonth]);

  const handleMonthChange = (month: string) => setCurrentMonth(month);

  const fetchMonthData = useCallback(async (month: string) => {
    async function safeFetch<T>(url: string, fallback: T): Promise<T> {
      try {
        const res = await fetch(url);
        if (!res.ok) return fallback;
        const json = await res.json();
        const extracted = (json?.data as Record<string, unknown>)?.data ?? json?.data ?? json;
        return extracted as T;
      } catch { return fallback; }
    }

    const today = new Date().toLocaleDateString("sv");
    const thirtyLater = new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv");

    const monthStart = `${month}-01`;
    const monthEnd = lastDayOfMonth(month);
    const [allCards, allSvcs, cdData, spData, txDataArr, instData, eventsData, tasksData, shoppingData, cbData, pmData, catData] = await Promise.all([
      safeFetch<CardWithDebt[]>("/api/credit-cards", []),
      safeFetch<RecurringPayment[]>("/api/recurring-payments", []),
      safeFetch<CardMonthly[]>(`/api/card-monthly?month=${month}`, []),
      safeFetch<RecurringPaymentMonthly[]>(`/api/recurring-payment-monthly?month=${month}`, []),
      safeFetch<Transaction[]>(`/api/transactions?page=1&pageSize=100&date_from=${month}-01&date_to=${lastDayOfMonth(month)}`, []),
      safeFetch<Installment[]>("/api/installments?active_only=true", []),
      safeFetch<AppEvent[]>(`/api/events?date_from=${today}&date_to=${thirtyLater}&status=pending,confirmed&pageSize=20`, []),
      safeFetch<Task[]>("/api/tasks?is_completed=false", []),
      safeFetch<ShoppingItem[]>("/api/shopping?is_completed=false", []),
      safeFetch<Cashback[]>(`/api/cashback?date_from=${monthStart}&date_to=${monthEnd}`, []),
      safeFetch<PaymentMethod[]>("/api/payment-methods", []),
      safeFetch<Category[]>("/api/categories", []),
    ]);

    setCards(allCards);
    setServices(allSvcs);
    setCardDebts(cdData);
    setServicePayments(spData);
    setUpcomingEvents(eventsData);
    setPendingTasks(tasksData.filter(t => !t.due_date || t.due_date >= today));
    setOverdueTasks(tasksData.filter(t => t.due_date && t.due_date < today));
    setActiveShopping(shoppingData);
    setPaymentMethods(pmData);
    setCategories(catData);

    const txIncomes = txDataArr.filter((t: Transaction) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
      + cbData.reduce((s: number, cb: Cashback) => s + Number(cb.amount), 0);
    const txExpenses = txDataArr.filter((t: Transaction) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const instMonthTotal = instData
      .filter((i: Installment) => isInstallmentInMonth(month, i.start_date, i.total_months))
      .reduce((s: number, i: Installment) => s + Number(i.monthly_amount), 0);
    const svcExpenses = spData.reduce((s: number, sp: RecurringPaymentMonthly) => s + Number(sp.amount), 0);

    setInstallmentTotal(instMonthTotal);
    setInstallments(instData);
    setTxData({
      incomes: txIncomes,
      expenses: txExpenses + instMonthTotal + svcExpenses,
      recentTx: txDataArr.slice(0, 5),
    });

    const calcMap: Record<string, CalculatedDebt> = {};
    for (const card of allCards) {
      if (card.type !== "credit") continue;
      const res = await safeFetch<CalculatedDebt | null>(`/api/card-monthly/calculate?cardId=${card.id}&month=${month}`, null);
      if (res) calcMap[card.id] = res;
    }
    setCalculatedDebts(calcMap);

    const freshDebts = await safeFetch<CardMonthly[]>(`/api/card-monthly?month=${month}`, []);
    setCardDebts(freshDebts);
  }, []);

  const fetchHistory = useCallback(async () => {
    async function safeFetch<T>(url: string, fallback: T): Promise<T> {
      try {
        const res = await fetch(url);
        if (!res.ok) return fallback;
        const json = await res.json();
        return (json?.data ?? json) as T;
      } catch { return fallback; }
    }

    const [cdHist, spHist] = await Promise.all([
      safeFetch<CardMonthly[]>("/api/card-monthly/history", []),
      safeFetch<RecurringPaymentMonthly[]>("/api/recurring-payment-monthly/history", []),
    ]);
    setHistoryCard(cdHist);
    setHistoryService(spHist);
  }, []);

  useEffect(() => { fetchMonthData(currentMonth); }, [currentMonth, fetchMonthData]);
  useEffect(() => { if (activeTab === "historial") fetchHistory(); }, [activeTab, fetchHistory]);

  async function handlePayFull(id: string) {
    try {
      const res = await fetch("/api/card-monthly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_paid: true }),
      });
      if (res.ok) {
        setCardDebts(prev => prev.map(d => d.id === id ? { ...d, is_paid: true, paid_at: new Date().toISOString() } : d));
      }
    } catch {}
    setPayDialog(null);
  }

  async function handlePayPartial(id: string, cardId: string, month: string, statementBalance: number, paidAmount: number, closingDay: number | null) {
    const remaining = statementBalance - paidAmount;
    if (remaining <= 0) {
      handlePayFull(id);
      return;
    }
    const pm = paymentMethods.find(p => p.card_id === cardId);
    const saldoCat = categories.find(c => c.name === "Saldo de tarjeta");
    try {
      await fetch("/api/card-monthly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_paid: true }),
      });
      const [y, m] = month.split("-").map(Number);
      const nextY = m === 12 ? y + 1 : y;
      const nextM = m === 12 ? 1 : m + 1;
      const day = closingDay ?? 1;
      const date = `${nextY}-${String(nextM).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          amount: remaining,
          payment_method_id: pm?.id ?? null,
          category_id: saldoCat?.id ?? null,
          description: `Saldo pendiente ${month}`,
          date,
        }),
      });
      setCardDebts(prev => prev.map(d => d.id === id ? { ...d, is_paid: true, paid_at: new Date().toISOString() } : d));
    } catch {}
    setPayDialog(null);
  }

  const getCardDebt = (cardId: string) => cardDebts.find(d => d.card_id === cardId);

  const tabs = [
    { key: "resumen", label: "Resumen" },
    { key: "tarjetas", label: "Tarjetas de crédito" },
    { key: "plazos", label: "Plazos" },
    { key: "eventos", label: "Eventos" },
    { key: "tareas", label: "Tareas" },
    { key: "historial", label: "Historial" },
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-2 border-b border-border pb-0">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); location.hash = "#" + t.key; }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                activeTab === t.key
                  ? "text-primary border-primary -mb-[1px]"
                  : "text-string-muted border-transparent hover:text-string -mb-[1px]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="shrink-0 pb-2"><MonthSelector value={currentMonth} onChange={handleMonthChange} /></div>
      </div>

      {/* Resumen */}
      {activeTab === "resumen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Ingresos</p>
              <p className="text-xl font-bold mt-1 text-success">{formatCurrency(txData.incomes)}</p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Gastos</p>
              <p className="text-xl font-bold mt-1 text-danger">{formatCurrency(txData.expenses)}</p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Balance</p>
              <p className={`text-xl font-bold mt-1 ${txData.incomes - txData.expenses >= 0 ? "text-success" : "text-danger"}`}>
                {formatCurrency(txData.incomes - txData.expenses)}
              </p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Tarjetas</p>
              <p className="text-xl font-bold mt-1 text-primary">{cards.length}</p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Plazos</p>
              <p className="text-xl font-bold mt-1 text-warning">{formatCurrency(installmentTotal)}</p>
            </div>
          </div>
          {installmentTotal > 0 && (
            <p className="text-xs text-string-muted -mt-4">* Incluye {formatCurrency(installmentTotal)} en plazos y {formatCurrency(servicePayments.reduce((s, sp) => s + Number(sp.amount), 0))} en pagos recurrentes</p>
          )}

          {/* Organización */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Tareas pendientes</p>
              <p className="text-xl font-bold mt-1 text-sky-600">{pendingTasks.length}</p>
              {overdueTasks.length > 0 && (
                <p className="text-xs text-danger mt-0.5">{overdueTasks.length} vencidas</p>
              )}
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Próximos eventos</p>
              <p className="text-xl font-bold mt-1 text-rose-600">{upcomingEvents.length}</p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Compras activas</p>
              <p className="text-xl font-bold mt-1 text-amber-600">{activeShopping.length}</p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-string-muted uppercase tracking-wider">Pagos recurrentes</p>
              <p className="text-xl font-bold mt-1 text-purple-600">{services.length}</p>
            </div>
          </div>

          {cardDebts.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-base font-semibold text-string mb-3">Deudas del mes</h2>
              <div className="space-y-2">
                  {cardDebts.map(d => {
                    const card = cards.find(c => c.id === d.card_id);
                    const dueIn = card && card.due_day != null ? daysUntil(card.due_day) : 0;
                    return (
                    <div key={d.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${d.is_paid ? "bg-success" : "bg-warning"}`} />
                        <span>{card?.name ?? "?"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono ${d.is_paid ? "text-success line-through" : "text-danger"}`}>
                          {formatCurrency(d.statement_balance)}
                        </span>
                        {!d.is_paid && card && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${dueDaysBadge(dueIn)}`}>
                            {dueIn <= 0 ? "Vencido" : `${dueIn} días`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {servicePayments.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-base font-semibold text-string mb-3">Pagos recurrentes del mes</h2>
              <div className="space-y-2">
                {servicePayments.map(sp => {
                  const svc = services.find(s => s.id === sp.payment_id);
                  return (
                    <div key={sp.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sp.is_paid ? "bg-success" : "bg-warning"}`} />
                        <span>{svc?.name ?? "?"}</span>
                      </div>
                      <span className="font-mono text-danger">
                        -{formatCurrency(sp.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-base font-semibold text-string mb-3">Transacciones del mes</h2>
            {txData.recentTx.length === 0 ? (
              <p className="text-sm text-string-muted">Sin transacciones</p>
            ) : (
              <div className="space-y-2">
                {txData.recentTx.map((tx: Transaction) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tx.type === "income" ? "bg-success" : "bg-danger"}`} />
                      <span>{tx.description || "Sin descripción"}</span>
                    </div>
                    <span className={`font-medium ${tx.type === "income" ? "text-success" : "text-danger"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tarjetas */}
      {activeTab === "tarjetas" && (
        <div className="space-y-4">
          {cards.length === 0 ? (
            <p className="text-string-muted text-sm">No hay tarjetas registradas</p>
          ) : (
            cards.map(card => {
              const debt = getCardDebt(card.id);
              const dueIn = card.due_day != null ? daysUntil(card.due_day) : 0;
              const calc = card.type === "credit" ? calculatedDebts[card.id] : null;
              const committed = calc ? calc.total_committed : (debt?.statement_balance ?? 0);
              const available = card.max_limit != null ? card.max_limit - committed : 0;
              const typeLabel = card.type === "credit" ? "Crédito" : card.type === "debit" ? "Débito" : "Vales";
              const isCredit = card.type === "credit";
              return (
                <div key={card.id} className={`bg-panel rounded-xl border-2 p-4 shadow-sm ${isCredit && debt && !debt.is_paid ? dueDaysBorder(dueIn) : "border-border"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-string">{card.name}</h3>
                      <span className="text-xs text-string-muted uppercase">{typeLabel}</span>
                    </div>
                    {debt && !debt.is_paid && (
                      <button
                        onClick={() => { setPayDialog({ debt, card }); setPayAmount(""); }}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-success text-white hover:bg-success-hover transition-colors"
                      >
                        Pagar
                      </button>
                    )}
                    {debt?.is_paid && (
                      <span className="px-3 py-1 text-xs font-medium rounded-lg bg-success-bg text-success-text">Pagada</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-string-muted">{isCredit ? "Límite" : "Saldo"}</p>
                      <p className="font-mono font-medium text-success">{card.max_limit != null ? formatCurrency(card.max_limit) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-string-muted">Deuda calculada</p>
                      {calc ? (
                        <div className="group relative">
                          <p className="font-mono font-medium text-danger cursor-help">{formatCurrency(calc.statement_balance)}</p>
                          <div className="absolute left-0 right-0 top-full mt-1 max-w-xs bg-panel border border-border rounded-lg shadow-lg p-3 text-xs z-10 hidden group-hover:block">
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>Compras</span><span className="font-mono text-danger">-{formatCurrency(calc.total_purchases)}</span></div>
                                <div className="flex justify-between"><span>Plazos (este mes)</span><span className="font-mono text-danger">-{formatCurrency(calc.total_installments)}</span></div>
                                <div className="flex justify-between"><span>Pagos recurrentes</span><span className="font-mono text-danger">-{formatCurrency(calc.total_recurring)}</span></div>
                                <div className="flex justify-between"><span>Cashback</span><span className="font-mono text-success">+{formatCurrency(calc.total_cashback)}</span></div>
                                <div className="border-t border-border pt-1 flex justify-between font-semibold"><span>Adeudo del mes</span><span className="font-mono">{formatCurrency(calc.statement_balance)}</span></div>
                              <div className="flex justify-between text-string-muted"><span>Plazos futuros</span><span className="font-mono">-{formatCurrency(calc.committed_installments)}</span></div>
                              <div className="border-t border-border pt-1 flex justify-between font-semibold"><span>Total comprometido</span><span className="font-mono">{formatCurrency(calc.total_committed)}</span></div>
                            </div>
                          </div>
                        </div>
                      ) : debt ? (
                        <p className="font-mono font-medium text-danger">{formatCurrency(debt.statement_balance)}</p>
                      ) : (
                        <p className="text-xs text-string-muted">-</p>
                      )}
                    </div>
                    {isCredit && (
                    <div>
                      <p className="text-xs text-string-muted">Disponible</p>
                      <p className={`font-mono font-medium ${available < 0 ? "text-danger" : "text-success"}`}>{formatCurrency(Math.max(0, available))}</p>
                    </div>
                    )}
                    <div>
                      <p className="text-xs text-string-muted">{isCredit ? "Cierre / Pago" : "Tipo"}</p>
                      <p className="font-mono font-medium">{card.closing_day != null && card.due_day != null ? `${card.closing_day} / ${card.due_day}` : typeLabel}</p>
                    </div>
                  </div>
                  {isCredit && debt && !debt.is_paid && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="text-string-muted">Vencimiento:</span>
                      <span className={`font-medium ${dueDaysBadge(dueIn)} px-2 py-0.5 rounded`}>
                        {dueIn <= 0 ? "Vencido" : `En ${dueIn} días (día ${card.due_day})`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Plazos */}
      {activeTab === "plazos" && (
        <div className="space-y-4">
          {installments.length === 0 ? (
            <p className="text-string-muted text-sm">No hay plazos activos</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                  <p className="text-xs text-string-muted uppercase tracking-wider">Plazos activos</p>
                  <p className="text-xl font-bold mt-1 text-primary">{installments.length}</p>
                </div>
                <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                  <p className="text-xs text-string-muted uppercase tracking-wider">Restante por pagar</p>
                  <p className="text-xl font-bold mt-1 text-danger">{formatCurrency(installments.reduce((s, i) => s + Number(i.remaining_months) * Number(i.monthly_amount), 0))}</p>
                </div>
                <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                  <p className="text-xs text-string-muted uppercase tracking-wider">Total de cuotas</p>
                  <p className="text-xl font-bold mt-1 text-warning">{installments.reduce((s, i) => s + Number(i.total_months), 0)}</p>
                </div>
              </div>
              <div className="space-y-3">
                {installments.map(i => {
                  const card = cards.find(c => c.id === i.card_id);
                  const remainingAmount = Number(i.remaining_months) * Number(i.monthly_amount);
                  const totalAmount = Number(i.total_amount);
                  return (
                    <div key={i.id} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-string">{i.description}</h3>
                          <span className="text-xs text-string-muted">{card?.name ?? "Sin tarjeta"}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${i.remaining_months <= 0 ? "bg-success-bg text-success-text" : i.remaining_months <= 3 ? "bg-warning-bg text-warning-text" : "bg-info-bg text-info-text"}`}>
                          {i.remaining_months}/{i.total_months} cuotas
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-string-muted">Total</p>
                          <p className="font-mono font-medium text-string">{formatCurrency(totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-string-muted">Cuota mensual</p>
                          <p className="font-mono font-medium text-danger">{formatCurrency(Number(i.monthly_amount))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-string-muted">Restante</p>
                          <p className="font-mono font-medium text-warning">{formatCurrency(remainingAmount)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Eventos */}
      {activeTab === "eventos" && (
        <div className="space-y-4">
          {!Array.isArray(upcomingEvents) ? (
            <div>
              <p className="text-sm text-danger">Error: datos de eventos inválidos</p>
              <pre className="text-xs text-string-muted mt-1">{JSON.stringify(upcomingEvents, null, 2).slice(0, 500)}</pre>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-string-muted text-sm">No hay eventos próximos</p>
          ) : (
            upcomingEvents.map(ev => (
              <div key={ev.id} className="bg-panel rounded-xl border border-border p-4 shadow-sm flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-string">{ev.description}</h3>
                  <p className="text-sm text-string-muted mt-1">
                    <span className="font-semibold">{new Date(ev.start_date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</span>
                    {ev.end_date && <span className="font-semibold"> — {new Date(ev.end_date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</span>}
                  </p>
                  {ev.location && <p className="text-xs text-string-muted mt-0.5">{ev.location}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ev.status === "confirmed" ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text"
                }`}>
                  {ev.status === "confirmed" ? "Confirmado" : "Pendiente"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tareas */}
      {activeTab === "tareas" && (
        <div className="space-y-4">
          {overdueTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-danger mb-2">Vencidas</h3>
              {overdueTasks.map(t => (
                <div key={t.id} className="bg-panel rounded-xl border border-danger p-3 shadow-sm flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-string">{t.description}</p>
                    <p className="text-xs text-danger">Vencía el <span className="font-semibold">{new Date(t.due_date!).toLocaleDateString("es-MX")}</span></p>
                  </div>
                  {t.priority > 0 && <span className="text-xs bg-danger-bg text-danger-text px-2 py-0.5 rounded-full">Prioridad {t.priority}</span>}
                </div>
              ))}
            </div>
          )}
          {pendingTasks.length === 0 && overdueTasks.length === 0 ? (
            <p className="text-string-muted text-sm">No hay tareas pendientes</p>
          ) : (
            <div>
              {overdueTasks.length > 0 && <h3 className="text-sm font-semibold text-string mb-2">Pendientes</h3>}
              {pendingTasks.map(t => (
                <div key={t.id} className="bg-panel rounded-xl border border-border p-3 shadow-sm flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-string">{t.description}</p>
                    {t.due_date && (
                      <p className="text-xs text-string-muted">Vence el <span className="font-semibold">{new Date(t.due_date).toLocaleDateString("es-MX")}</span></p>
                    )}
                  </div>
                  {t.priority > 0 && <span className="text-xs bg-warning-bg text-warning-text px-2 py-0.5 rounded-full">Prioridad {t.priority}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {activeTab === "historial" && (
        <div className="space-y-6">
          <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-base font-semibold text-string mb-3">Historial de tarjetas</h2>
            {historyCard.length === 0 ? (
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
                    {historyCard.map(d => {
                      const card = cards.find(c => c.id === d.card_id);
                      return (
                        <tr key={d.id} className="border-b border-border/50">
                          <td className="px-3 py-2 text-string-muted">{monthLabel(d.month)}</td>
                          <td className="px-3 py-2 font-medium">{card?.name ?? "?"}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(d.statement_balance)}</td>
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
          <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-base font-semibold text-string mb-3">Historial de pagos recurrentes</h2>
            {historyService.length === 0 ? (
              <p className="text-sm text-string-muted">Sin datos históricos</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-string-muted text-xs uppercase border-b border-border">
                      <th className="text-left px-3 py-2">Mes</th>
                      <th className="text-left px-3 py-2">Pago</th>
                      <th className="text-right px-3 py-2">Monto</th>
                      <th className="text-center px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyService.map(sp => {
                      const svc = services.find(s => s.id === sp.payment_id);
                      return (
                        <tr key={sp.id} className="border-b border-border/50">
                          <td className="px-3 py-2 text-string-muted">{monthLabel(sp.month)}</td>
                          <td className="px-3 py-2 font-medium">{svc?.name ?? "?"}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(sp.amount)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${sp.is_paid ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text"}`}>
                              {sp.is_paid ? "Pagado" : "Pendiente"}
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
        </div>
      )}

      {payDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={() => setPayDialog(null)}>
          <div className="bg-panel rounded-xl border border-border shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-string mb-1">Pagar tarjeta</h3>
            <p className="text-sm text-string-muted mb-4">{payDialog.card.name} — {formatCurrency(payDialog.debt.statement_balance)}</p>
            <div className="space-y-3">
              <button onClick={() => handlePayFull(payDialog.debt.id)} className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors">
                Pagar todo ({formatCurrency(payDialog.debt.statement_balance)})
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-string-muted">o</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-string mb-1">Pago parcial</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={payDialog.debt.statement_balance}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 block rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      const amt = parseFloat(payAmount);
                      if (amt > 0 && amt <= payDialog.debt.statement_balance) {
                        handlePayPartial(payDialog.debt.id, payDialog.card.id, payDialog.debt.month, payDialog.debt.statement_balance, amt, payDialog.card.closing_day);
                      }
                    }}
                    disabled={!payAmount || parseFloat(payAmount) <= 0}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-success text-white hover:bg-success-hover disabled:opacity-50 transition-colors"
                  >
                    Pagar
                  </button>
                </div>
                {payAmount && parseFloat(payAmount) > 0 && (
                  <p className="text-xs text-string-muted mt-1">
                    Restante: {formatCurrency(payDialog.debt.statement_balance - parseFloat(payAmount))} — se agregará como gasto al mes siguiente
                  </p>
                )}
              </div>
              <button onClick={() => setPayDialog(null)} className="w-full py-2 text-sm text-nav hover:text-string transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import type { Transaction } from "@/lib/types/transaction.ts";
import type { DashboardMonthData } from "@/lib/types/dashboard.ts";
import { currentMonthStr, formatDate, daysUntilPaymentDue, isPaymentLate } from "@/lib/date.ts";
import { formatCurrency } from "@/lib/format.ts";
import { fetchDashboardMonth } from "@/lib/dashboard/api.ts";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import StatCard from "@/components/app/dashboard/StatCard.tsx";
import Select from "@/components/ui/Select.tsx";

function dueDaysBadge(days: number): string {
  if (days <= 3) return "bg-danger-bg text-danger-text";
  if (days <= 8) return "bg-warning-bg text-warning-text";
  return "bg-success-bg text-success-text";
}

export const DASHBOARD_TABS = [
  { key: "summary", label: "Resumen" },

  { key: "events", label: "Eventos" },
  { key: "tasks", label: "Tareas" },
];

interface DashboardProps {
  createdAt?: string;
  initialMonth: string;
  initialTab: string;
  initialData: string;
}

export default function DashboardContent({ createdAt, initialMonth, initialTab, initialData }: DashboardProps) {
  const defaultMonth = currentMonthStr();
  const defaultTab = "summary";
  const tabs = DASHBOARD_TABS;

  const [activeTab, setActiveTab] = useState(() => {
    // Legacy #tab links: the server can't see the hash, so adopt it on the client.
    const h = typeof location !== "undefined" ? location.hash.replace("#", "") : "";
    return tabs.some(t => t.key === h) ? h : initialTab;
  });
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [monthData, setMonthData] = useState<DashboardMonthData>(() => JSON.parse(initialData) as DashboardMonthData);

  const {
    cards, services, cardDebts, servicePayments, upcomingEvents, pendingTasks,
    overdueTasks, activeShopping, paymentMethods, categories, calculatedDebts,
    incomes, expenses, recentTx, installmentTotal,
  } = monthData;
  const txData = { incomes, expenses, recentTx };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (currentMonth !== defaultMonth) params.set("month", currentMonth);
    else params.delete("month");
    if (activeTab !== defaultTab) params.set("tab", activeTab);
    else params.delete("tab");
    const qs = params.toString();
    history.replaceState(null, "", (qs ? "?" + qs : location.pathname));
  }, [activeTab, currentMonth, defaultTab, defaultMonth]);

  const handleMonthChange = (month: string) => setCurrentMonth(month);

  // Initial month data comes from SSR props; only refetch when the month changes.
  const loadedMonthRef = useRef(initialMonth);
  useEffect(() => {
    if (currentMonth === loadedMonthRef.current) return;
    loadedMonthRef.current = currentMonth;
    let cancelled = false;
    fetchDashboardMonth(currentMonth).then(data => {
      if (!cancelled) setMonthData(data);
    });
    return () => { cancelled = true; };
  }, [currentMonth]);

  const getCardDebt = (cardId: string) => cardDebts.find(d => d.card_id === cardId);
  const creditCardDebts = cardDebts.filter(d => cards.some(c => c.id === d.card_id && c.type === "credit"));

  function selectTab(key: string) {
    setActiveTab(key);
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const idx = tabs.findIndex(t => t.key === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    selectTab(tabs[next].key);
    document.getElementById(`tab-${tabs[next].key}`)?.focus();
  }

  return (
    <div>
      {/* Mobile: tab select */}
      <div className="flex md:hidden items-center gap-2 mb-4">
        <div className="flex-1">
          <Select
            value={activeTab}
            onChange={selectTab}
            options={tabs.map(t => ({ value: t.key, label: t.label }))}
            ariaLabel="Sección"
          />
        </div>
        <div className="shrink-0"><MonthSelector value={currentMonth} onChange={handleMonthChange} createdAt={createdAt} /></div>
      </div>

      {/* Desktop: tab buttons */}
      <div className="hidden md:flex items-end justify-between mb-6 gap-2 border-b border-border pb-0">
        <div className="flex gap-0" role="tablist" aria-label="Secciones del dashboard">
          {tabs.map(t => (
            <button
              key={t.key}
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={activeTab === t.key}
              aria-controls={`panel-${t.key}`}
              tabIndex={activeTab === t.key ? 0 : -1}
              onClick={() => selectTab(t.key)}
              onKeyDown={onTabKeyDown}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                activeTab === t.key
                  ? "text-primary border-primary -mb-px"
                  : "text-string-muted border-transparent hover:text-string -mb-px"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="shrink-0 pb-2"><MonthSelector value={currentMonth} onChange={handleMonthChange} createdAt={createdAt} /></div>
      </div>

      {/* Resumen */}
      {activeTab === "summary" && (
        <div className="space-y-6" role="tabpanel" id="panel-summary" aria-labelledby="tab-summary" tabIndex={0}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Ingresos" value={formatCurrency(txData.incomes)} colorClass="text-success" />
            <StatCard label="Gastos" value={formatCurrency(txData.expenses)} colorClass="text-danger" />
            <StatCard label="Balance" value={formatCurrency(txData.incomes - txData.expenses)} colorClass={txData.incomes - txData.expenses >= 0 ? "text-success" : "text-danger"} />
            <StatCard label="Tarjetas de crédito" value={String(cards.filter(c => c.type === "credit").length)} colorClass="text-primary" />
            <StatCard label="Plazos" value={formatCurrency(installmentTotal)} colorClass="text-warning" />
          </div>
          {(installmentTotal > 0 || servicePayments.length > 0) && (
            <p className="text-xs text-string-muted -mt-4">* Incluye {formatCurrency(installmentTotal)} en plazos
              {servicePayments.filter(sp => sp.type === "expense").length > 0 && ` y ${formatCurrency(servicePayments.filter(sp => sp.type === "expense").reduce((s, sp) => s + Number(sp.amount), 0))} en gastos recurrentes`}
              {servicePayments.filter(sp => sp.type === "income").length > 0 && `, más ${formatCurrency(servicePayments.filter(sp => sp.type === "income").reduce((s, sp) => s + Number(sp.amount), 0))} en ingresos recurrentes`}
            </p>
          )}

          {/* Organización */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Tareas pendientes"
              value={String(pendingTasks.length)}
              colorClass="text-sky-600"
              sub={overdueTasks.length > 0 ? <p className="text-xs text-danger mt-0.5">{overdueTasks.length} vencidas</p> : undefined}
            />
            <StatCard label="Próximos eventos" value={String(upcomingEvents.length)} colorClass="text-rose-600" />
            <StatCard label="Compras activas" value={String(activeShopping.length)} colorClass="text-amber-600" />
            <StatCard label="Pagos recurrentes" value={String(services.length)} colorClass="text-purple-600" />
          </div>

          {creditCardDebts.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-base font-semibold text-string mb-3">Deudas de tarjetas de crédito del mes</h2>
              <div className="space-y-2">
                  {creditCardDebts.map(d => {
                    const card = cards.find(c => c.id === d.card_id);
                    const dueIn = card && card.payment_due_day != null ? daysUntilPaymentDue(currentMonth, card.cutoff_day, card.payment_due_day) : 0;
                    const paidLate = d.is_paid && isPaymentLate(currentMonth, card?.cutoff_day ?? null, card?.payment_due_day ?? null, d.paid_at);
                    return (
                    <div key={d.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${d.is_paid ? (paidLate ? "bg-danger" : "bg-success") : "bg-warning"}`} />
                        <span>{card?.name ?? "?"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono ${d.is_paid ? (paidLate ? "text-danger" : "text-success line-through") : "text-danger"}`}>
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

          {servicePayments.filter(sp => sp.type === "income").length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-base font-semibold text-string mb-3">💵 Ingresos recurrentes</h2>
              <div className="space-y-2">
                {servicePayments.filter(sp => sp.type === "income").map(sp => {
                  const svc = services.find(s => s.id === sp.payment_id);
                  return (
                    <div key={sp.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sp.is_paid ? "bg-success" : "bg-warning"}`} />
                        <span>{svc?.name ?? "?"}</span>
                      </div>
                      <span className="font-mono text-success">
                        +{formatCurrency(sp.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {servicePayments.filter(sp => sp.type === "expense").length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-base font-semibold text-string mb-3">💰 Gastos recurrentes</h2>
              <div className="space-y-2">
                {servicePayments.filter(sp => sp.type === "expense").map(sp => {
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



      {/* Eventos */}
      {activeTab === "events" && (
        <div className="space-y-4" role="tabpanel" id="panel-events" aria-labelledby="tab-events" tabIndex={0}>
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
                    <span className="font-semibold">{formatDate(ev.start_date, "es-MX", { weekday: "short", day: "numeric", month: "short" })}</span>
                    {ev.end_date && <span className="font-semibold"> — {formatDate(ev.end_date, "es-MX", { weekday: "short", day: "numeric", month: "short" })}</span>}
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
      {activeTab === "tasks" && (
        <div className="space-y-4" role="tabpanel" id="panel-tasks" aria-labelledby="tab-tasks" tabIndex={0}>
          {overdueTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-danger mb-2">Vencidas</h3>
              {overdueTasks.map(t => (
                <div key={t.id} className="bg-panel rounded-xl border border-danger p-3 shadow-sm flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-string">{t.description}</p>
                    <p className="text-xs text-danger">Vencía el <span className="font-semibold">{formatDate(t.due_date!, "es-MX")}</span></p>
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
                      <p className="text-xs text-string-muted">Vence el <span className="font-semibold">{formatDate(t.due_date, "es-MX")}</span></p>
                    )}
                  </div>
                  {t.priority > 0 && <span className="text-xs bg-warning-bg text-warning-text px-2 py-0.5 rounded-full">Prioridad {t.priority}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

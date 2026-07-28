import { useState, useEffect, useMemo } from "react";
import type { Transaction } from "@/lib/types/transaction.ts";
import type { CardMonthly } from "@/lib/types/card-monthly.ts";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";
import type { DashboardMonthData, CardWithDebt } from "@/lib/types/dashboard.ts";
import { monthLabel, daysUntilPaymentDue, isPaymentLate } from "@/lib/date.ts";
import { formatCurrency } from "@/lib/format.ts";
import { fetchDashboardMonth, fetchDashboardHistory, payCardDebtFull, payCardDebtPartial, EMPTY_DASHBOARD_MONTH } from "@/lib/dashboard/api.ts";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import StatCard from "@/components/app/dashboard/StatCard.tsx";
import Select from "@/components/ui/Select.tsx";
import { BTN_CANCEL } from "@/lib/form-fields.ts";

function dueDaysBorder(days: number): string {
  if (days <= 3) return "border-danger";
  if (days <= 8) return "border-warning";
  return "border-success";
}

function dueDaysBadge(days: number): string {
  if (days <= 3) return "bg-danger-bg text-danger-text";
  if (days <= 8) return "bg-warning-bg text-warning-text";
  return "bg-success-bg text-success-text";
}

interface DashboardProps {
  createdAt?: string;
}

export default function DashboardContent({ createdAt }: DashboardProps) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultTab = "resumen";

  const [activeTab, setActiveTab] = useState(() => typeof location !== "undefined" ? location.hash.replace("#", "") || defaultTab : defaultTab);
  const [currentMonth, setCurrentMonth] = useState(() => typeof location !== "undefined" ? new URLSearchParams(location.search).get("month") || defaultMonth : defaultMonth);
  const [monthData, setMonthData] = useState<DashboardMonthData>(EMPTY_DASHBOARD_MONTH);
  const [historyCard, setHistoryCard] = useState<CardMonthly[]>([]);
  const [historyService, setHistoryService] = useState<RecurringPaymentMonthly[]>([]);
  const [payDialog, setPayDialog] = useState<{ debt: CardMonthly; card: CardWithDebt } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  const {
    cards, services, cardDebts, servicePayments, upcomingEvents, pendingTasks,
    overdueTasks, activeShopping, paymentMethods, categories, calculatedDebts,
    incomes, expenses, recentTx, installmentTotal, installments,
  } = monthData;
  const txData = { incomes, expenses, recentTx };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (currentMonth !== defaultMonth) params.set("month", currentMonth);
    else params.delete("month");
    const qs = params.toString();
    const hash = activeTab !== defaultTab ? `#${activeTab}` : "";
    history.replaceState(null, "", (qs ? "?" + qs : location.pathname) + hash);
  }, [activeTab, currentMonth, defaultTab, defaultMonth]);

  const handleMonthChange = (month: string) => setCurrentMonth(month);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardMonth(currentMonth).then(data => {
      if (!cancelled) setMonthData(data);
    });
    return () => { cancelled = true; };
  }, [currentMonth]);

  useEffect(() => {
    if (activeTab !== "historial") return;
    fetchDashboardHistory().then(h => {
      setHistoryCard(h.card);
      setHistoryService(h.service);
    });
  }, [activeTab]);

  function markDebtPaid(id: string, paidAt: string) {
    setMonthData(prev => ({
      ...prev,
      cardDebts: prev.cardDebts.map(d => d.id === id ? { ...d, is_paid: true, paid_at: paidAt } : d),
    }));
  }

  async function handlePayFull(id: string) {
    const paidAt = payDate || undefined;
    if (await payCardDebtFull(id, paidAt)) markDebtPaid(id, paidAt ?? new Date().toISOString());
    setPayDialog(null);
  }

  async function handlePayPartial() {
    if (!payDialog) return;
    const amt = parseFloat(payAmount);
    if (!(amt > 0 && amt <= payDialog.debt.statement_balance)) return;
    const paidAt = payDate || undefined;
    const ok = await payCardDebtPartial({
      id: payDialog.debt.id,
      month: payDialog.debt.month,
      statementBalance: payDialog.debt.statement_balance,
      paidAmount: amt,
      cutoffDay: payDialog.card.cutoff_day,
      paymentMethodId: paymentMethods.find(p => p.card_id === payDialog.card.id)?.id ?? null,
      categoryId: categories.find(c => c.name === "Saldo de tarjeta")?.id ?? null,
      paidAt,
    });
    if (ok) markDebtPaid(payDialog.debt.id, paidAt ?? new Date().toISOString());
    setPayDialog(null);
  }

  const getCardDebt = (cardId: string) => cardDebts.find(d => d.card_id === cardId);
  const visibleCards = cards.filter(c => c.type === "credit");

  const tabs = [
    { key: "resumen", label: "Resumen" },
    { key: "tarjetas", label: "Tarjetas" },
    { key: "plazos", label: "Plazos" },
    { key: "eventos", label: "Eventos" },
    { key: "tareas", label: "Tareas" },
    { key: "historial", label: "Historial" },
  ];

  return (
    <div>
      {/* Mobile: tab select */}
      <div className="flex md:hidden items-center gap-2 mb-4">
        <div className="flex-1">
          <Select
            value={activeTab}
            onChange={(v) => { setActiveTab(v); location.hash = "#" + v; }}
            options={tabs.map(t => ({ value: t.key, label: t.label }))}
            ariaLabel="Sección"
          />
        </div>
        <div className="shrink-0"><MonthSelector value={currentMonth} onChange={handleMonthChange} createdAt={createdAt} /></div>
      </div>

      {/* Desktop: tab buttons */}
      <div className="hidden md:flex items-end justify-between mb-6 gap-2 border-b border-border pb-0">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); location.hash = "#" + t.key; }}
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
      {activeTab === "resumen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Ingresos" value={formatCurrency(txData.incomes)} colorClass="text-success" />
            <StatCard label="Gastos" value={formatCurrency(txData.expenses)} colorClass="text-danger" />
            <StatCard label="Balance" value={formatCurrency(txData.incomes - txData.expenses)} colorClass={txData.incomes - txData.expenses >= 0 ? "text-success" : "text-danger"} />
            <StatCard label="Tarjetas" value={String(cards.length)} colorClass="text-primary" />
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

          {cardDebts.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-base font-semibold text-string mb-3">Deudas del mes</h2>
              <div className="space-y-2">
                  {cardDebts.map(d => {
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

      {/* Tarjetas */}
      {activeTab === "tarjetas" && (
        <div className="space-y-4">
          {visibleCards.length === 0 ? (
            <p className="text-string-muted text-sm">No hay tarjetas registradas</p>
          ) : (
            visibleCards.map(card => {
              const debt = getCardDebt(card.id);
              const dueIn = card.payment_due_day != null ? daysUntilPaymentDue(currentMonth, card.cutoff_day, card.payment_due_day) : 0;
              const paidLate = debt?.is_paid === true && isPaymentLate(currentMonth, card.cutoff_day, card.payment_due_day, debt.paid_at);
              const calc = card.type === "credit" ? calculatedDebts[card.id] : null;
              const committed = calc ? calc.total_committed : (debt?.statement_balance ?? 0);
              const available = card.max_limit != null ? card.max_limit - committed : 0;
              const typeLabel = card.type === "credit" ? "Crédito" : card.type === "debit" ? "Débito" : "Vales";
              const isCredit = card.type === "credit";
              const borderClass = isCredit && debt && !debt.is_paid ? dueDaysBorder(dueIn) : paidLate ? "border-danger" : "border-border";
              return (
                <div key={card.id} className={`bg-panel rounded-xl border-2 p-4 shadow-sm ${borderClass}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-string">{card.name}</h3>
                      <span className="text-xs text-string-muted uppercase">{typeLabel}</span>
                    </div>
                    {debt && !debt.is_paid && (
                      <button
                        onClick={() => { setPayDialog({ debt, card }); setPayAmount(""); setPayDate(new Date().toLocaleDateString("sv")); }}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-success text-white hover:bg-success-hover transition-colors"
                      >
                        Pagar
                      </button>
                    )}
                    {debt?.is_paid && (
                      <span className={`px-3 py-1 text-xs font-medium rounded-lg ${paidLate ? "bg-danger-bg text-danger-text" : "bg-success-bg text-success-text"}`}>
                        {paidLate ? "Pagada tarde" : "Pagada"}
                      </span>
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
                      <p className="text-xs text-string-muted">{isCredit ? "Corte / Pago" : "Tipo"}</p>
                      <p className="font-mono font-medium">{card.cutoff_day != null && card.payment_due_day != null ? `${card.cutoff_day} / ${card.payment_due_day}` : typeLabel}</p>
                    </div>
                  </div>
                  {isCredit && debt && !debt.is_paid && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="text-string-muted">Límite de pago:</span>
                      <span className={`font-medium ${dueDaysBadge(dueIn)} px-2 py-0.5 rounded`}>
                        {dueIn <= 0 ? "Vencido" : `En ${dueIn} días (día ${card.payment_due_day})`}
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
                <StatCard label="Plazos activos" value={String(installments.length)} colorClass="text-primary" />
                <StatCard label="Restante por pagar" value={formatCurrency(installments.reduce((s, i) => s + Number(i.remaining_months) * Number(i.monthly_amount), 0))} colorClass="text-danger" />
                <StatCard label="Total de cuotas" value={String(installments.reduce((s, i) => s + Number(i.total_months), 0))} colorClass="text-warning" />
              </div>
              <div className="space-y-3">
                {installments.map(i => {
                  const pm = paymentMethods.find(p => p.id === i.payment_method_id);
                  const card = pm?.card_id ? cards.find(c => c.id === pm.card_id) : undefined;
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
              <div>
                <label className="block text-sm font-medium text-string mb-1">Fecha de pago</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
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
                    onClick={handlePayPartial}
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
                {BTN_CANCEL}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import type { CreditCard } from "@/lib/types/credit-card";

interface CardMonthly {
  id: string;
  card_id: string;
  month: string;
  statement_balance: number;
  is_paid: boolean;
  paid_at: string | null;
}

interface ServiceMonthly {
  id: string;
  service_id: string;
  month: string;
  amount: number;
  is_active: boolean;
  is_paid: boolean;
  paid_at: string | null;
}

interface RecurringService {
  id: string;
  name: string;
  default_amount: number;
}

interface CardWithDebt extends CreditCard {
  debt?: CardMonthly;
}

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function getMonthOptions(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }
  return months;
}

function monthLabel(month: string): string {
  const d = new Date(month + "-01");
  return d.toLocaleDateString("es", { year: "numeric", month: "long" });
}

function daysUntil(day: number): number {
  const now = new Date();
  const today = now.getDate();
  if (day === today) return 0;
  let target = new Date(now.getFullYear(), now.getMonth(), day);
  if (target < now) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function dueDaysClass(days: number): string {
  if (days <= 0) return "bg-gray-100 text-gray-600";
  if (days <= 3) return "bg-red-100 text-red-700 border-red-300";
  if (days <= 8) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-green-50 text-green-700 border-green-200";
}

function formatCurrency(n: number): string {
  return "$" + n.toFixed(2);
}

const months = getMonthOptions();

export default function DashboardContent() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [currentMonth, setCurrentMonth] = useState(months[0]);
  const [cards, setCards] = useState<CardWithDebt[]>([]);
  const [services, setServices] = useState<RecurringService[]>([]);
  const [cardDebts, setCardDebts] = useState<CardMonthly[]>([]);
  const [servicePayments, setServicePayments] = useState<ServiceMonthly[]>([]);
  const [historyCard, setHistoryCard] = useState<CardMonthly[]>([]);
  const [historyService, setHistoryService] = useState<ServiceMonthly[]>([]);
  const [txData, setTxData] = useState({ incomes: 0, expenses: 0, recentTx: [] as any[] });
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [balanceInput, setBalanceInput] = useState("");

  const fetchMonthData = useCallback(async (month: string) => {
    try {
      const [cardsRes, servicesRes, cardDebtRes, svcPayRes, txRes] = await Promise.all([
        fetch("/api/credit-cards"),
        fetch("/api/services"),
        fetch(`/api/card-monthly?month=${month}`),
        fetch(`/api/service-monthly?month=${month}`),
        fetch(`/api/transactions?page=1&pageSize=100`),
      ]);
      const cardsJson = await cardsRes.json();
      const svcJson = await servicesRes.json();
      const cdJson = await cardDebtRes.json();
      const spJson = await svcPayRes.json();
      const txJson = await txRes.json();

      let allCards: CardWithDebt[] = cardsJson.data ?? cardsJson ?? [];
      let allSvcs: RecurringService[] = svcJson.data ?? svcJson ?? [];
      let cdData: CardMonthly[] = cdJson.data ?? cdJson ?? [];
      let spData: ServiceMonthly[] = spJson.data ?? spJson ?? [];
      let txDataArr: any[] = txJson.data ?? txJson ?? [];
      if (!Array.isArray(txDataArr)) txDataArr = [];

      setCards(allCards);
      setServices(allSvcs);
      setCardDebts(cdData);
      setServicePayments(spData);
      setTxData({
        incomes: txDataArr.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0),
        expenses: txDataArr.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0),
        recentTx: txDataArr.slice(0, 5),
      });
    } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const [cdHist, spHist] = await Promise.all([
        fetch("/api/card-monthly/history"),
        fetch("/api/service-monthly/history"),
      ]);
      const cdJson = await cdHist.json();
      const spJson = await spHist.json();
      setHistoryCard(cdJson.data ?? cdJson ?? []);
      setHistoryService(spJson.data ?? spJson ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchMonthData(currentMonth); }, [currentMonth, fetchMonthData]);
  useEffect(() => { if (activeTab === "historial") fetchHistory(); }, [activeTab, fetchHistory]);

  async function handleToggleCardPaid(id: string, isPaid: boolean) {
    try {
      const res = await fetch("/api/card-monthly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_paid: isPaid }),
      });
      if (res.ok) {
        setCardDebts(prev => prev.map(d => d.id === id ? { ...d, is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null } : d));
      }
    } catch {}
  }

  async function handleToggleServicePaid(id: string, isPaid: boolean) {
    try {
      const res = await fetch("/api/service-monthly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_paid: isPaid }),
      });
      if (res.ok) {
        setServicePayments(prev => prev.map(d => d.id === id ? { ...d, is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null } : d));
      }
    } catch {}
  }

  async function handleSaveBalance(cardId: string, month: string) {
    const statementBalance = parseFloat(balanceInput);
    if (isNaN(statementBalance)) return;
    try {
      const res = await fetch("/api/card-monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, month, statement_balance: statementBalance }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setCardDebts(prev => {
          const idx = prev.findIndex(d => d.card_id === cardId && d.month === month);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data;
            return next;
          }
          return [...prev, data];
        });
        setEditingBalance(null);
        setBalanceInput("");
      }
    } catch {}
  }

  async function handleCreateServicePayment(serviceId: string) {
    try {
      const res = await fetch(`/api/services/${serviceId}/monthly?month=${currentMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchMonthData(currentMonth);
      }
    } catch {}
  }

  const getCardDebt = (cardId: string) => cardDebts.find(d => d.card_id === cardId);

  const tabs = [
    { key: "resumen", label: "Resumen" },
    { key: "tarjetas", label: "Tarjetas" },
    { key: "servicios", label: "Servicios" },
    { key: "historial", label: "Historial" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === t.key
                  ? "bg-indigo-600 text-white"
                  : "bg-panel text-text-muted hover:text-text hover:bg-nav-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={currentMonth}
          onChange={e => setCurrentMonth(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-panel text-text"
        >
          {months.map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Resumen */}
      {activeTab === "resumen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider">Ingresos</p>
              <p className="text-xl font-bold mt-1 text-green-600">{formatCurrency(txData.incomes)}</p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider">Gastos</p>
              <p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(txData.expenses)}</p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider">Balance</p>
              <p className={`text-xl font-bold mt-1 ${txData.incomes - txData.expenses >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(txData.incomes - txData.expenses)}
              </p>
            </div>
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs text-text-muted uppercase tracking-wider">Tarjetas</p>
              <p className="text-xl font-bold mt-1 text-indigo-600">{cards.length}</p>
            </div>
          </div>

          {cardDebts.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-base font-semibold text-text mb-3">Deudas del mes</h2>
              <div className="space-y-2">
                {cardDebts.map(d => {
                  const card = cards.find(c => c.id === d.card_id);
                  const dueIn = card ? daysUntil(card.due_day) : 0;
                  return (
                    <div key={d.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${d.is_paid ? "bg-green-400" : "bg-orange-400"}`} />
                        <span>{card?.name ?? "?"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono ${d.is_paid ? "text-green-600 line-through" : "text-red-600"}`}>
                          {formatCurrency(d.statement_balance)}
                        </span>
                        {!d.is_paid && card && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${dueDaysClass(dueIn)}`}>
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
              <h2 className="text-base font-semibold text-text mb-3">Servicios del mes</h2>
              <div className="space-y-2">
                {servicePayments.map(sp => {
                  const svc = services.find(s => s.id === sp.service_id);
                  return (
                    <div key={sp.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sp.is_paid ? "bg-green-400" : "bg-orange-400"}`} />
                        <span>{svc?.name ?? "?"}</span>
                      </div>
                      <span className={`font-mono ${sp.is_paid ? "text-green-600 line-through" : "text-red-600"}`}>
                        {formatCurrency(sp.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-base font-semibold text-text mb-3">Últimas transacciones</h2>
            {txData.recentTx.length === 0 ? (
              <p className="text-sm text-text-muted">Sin transacciones</p>
            ) : (
              <div className="space-y-2">
                {txData.recentTx.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tx.type === "income" ? "bg-green-400" : "bg-red-400"}`} />
                      <span>{tx.description || "Sin descripción"}</span>
                    </div>
                    <span className={`font-medium ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
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
            <p className="text-text-muted text-sm">No hay tarjetas registradas</p>
          ) : (
            cards.map(card => {
              const debt = getCardDebt(card.id);
              const dueIn = daysUntil(card.due_day);
              const available = card.max_limit - (debt?.statement_balance ?? 0);
              return (
                <div key={card.id} className={`bg-panel rounded-xl border p-4 shadow-sm ${dueDaysClass(card.due_day > 0 ? dueIn : 99)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-text">{card.name}</h3>
                      <span className="text-xs text-text-muted uppercase">{card.type === "credit" ? "Crédito" : "Débito"}</span>
                    </div>
                    {debt && (
                      <button
                        onClick={() => handleToggleCardPaid(debt.id, !debt.is_paid)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          debt.is_paid
                            ? "bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {debt.is_paid ? "Pagada" : "Pagar"}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-text-muted">Límite</p>
                      <p className="font-mono font-medium">{formatCurrency(card.max_limit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Deuda</p>
                      {debt ? (
                        <div className="flex items-center gap-1">
                          {editingBalance === card.id ? (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                value={balanceInput}
                                onChange={e => setBalanceInput(e.target.value)}
                                className="w-24 text-sm border border-border rounded px-1 py-0.5 font-mono"
                                autoFocus
                                onKeyDown={e => { if (e.key === "Enter") handleSaveBalance(card.id, currentMonth); if (e.key === "Escape") setEditingBalance(null); }}
                              />
                              <button onClick={() => handleSaveBalance(card.id, currentMonth)} className="text-xs text-indigo-600">OK</button>
                              <button onClick={() => { setEditingBalance(null); setBalanceInput(""); }} className="text-xs text-gray-400">X</button>
                            </>
                          ) : (
                            <button onClick={() => { setEditingBalance(card.id); setBalanceInput(String(debt.statement_balance)); }} className="font-mono font-medium text-red-600 hover:text-indigo-600">
                              {formatCurrency(debt.statement_balance)}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {editingBalance === card.id ? (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                value={balanceInput}
                                onChange={e => setBalanceInput(e.target.value)}
                                className="w-24 text-sm border border-border rounded px-1 py-0.5 font-mono"
                                autoFocus
                                onKeyDown={e => { if (e.key === "Enter") handleSaveBalance(card.id, currentMonth); if (e.key === "Escape") setEditingBalance(null); }}
                              />
                              <button onClick={() => handleSaveBalance(card.id, currentMonth)} className="text-xs text-indigo-600">OK</button>
                              <button onClick={() => { setEditingBalance(null); setBalanceInput(""); }} className="text-xs text-gray-400">X</button>
                            </>
                          ) : (
                            <button onClick={() => { setEditingBalance(card.id); setBalanceInput("0"); }} className="text-xs text-text-muted hover:text-indigo-600">Establecer</button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Disponible</p>
                      <p className={`font-mono font-medium ${available < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(Math.max(0, available))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Cierre / Pago</p>
                      <p className="font-mono font-medium">{card.closing_day} / {card.due_day}</p>
                    </div>
                  </div>
                  {card.type === "credit" && debt && !debt.is_paid && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="text-text-muted">Vencimiento:</span>
                      <span className={`font-medium ${dueDaysClass(dueIn)} px-2 py-0.5 rounded`}>
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

      {/* Servicios */}
      {activeTab === "servicios" && (
        <div className="space-y-4">
          {services.length === 0 ? (
            <p className="text-text-muted text-sm">No hay servicios registrados. Crea uno en la sección Servicios.</p>
          ) : (
            services.map(svc => {
              const payment = servicePayments.find(sp => sp.service_id === svc.id);
              return (
                <div key={svc.id} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-text">{svc.name}</h3>
                      <p className="text-sm text-text-muted">{formatCurrency(svc.default_amount)}/mes</p>
                    </div>
                    {payment ? (
                      <button
                        onClick={() => handleToggleServicePaid(payment.id, !payment.is_paid)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          payment.is_paid
                            ? "bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {payment.is_paid ? "Pagado" : "Pagar"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateServicePayment(svc.id)}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Agregar al mes
                      </button>
                    )}
                  </div>
                  {payment && (
                    <div className="mt-2 text-xs text-text-muted">
                      {payment.is_paid
                        ? `Pagado${payment.paid_at ? ` el ${new Date(payment.paid_at).toLocaleDateString("es")}` : ""}`
                        : `Pendiente - ${formatCurrency(payment.amount)}`}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Historial */}
      {activeTab === "historial" && (
        <div className="space-y-6">
          <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-base font-semibold text-text mb-3">Historial de tarjetas</h2>
            {historyCard.length === 0 ? (
              <p className="text-sm text-text-muted">Sin datos históricos</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase border-b border-border">
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
                          <td className="px-3 py-2 text-text-muted">{monthLabel(d.month)}</td>
                          <td className="px-3 py-2 font-medium">{card?.name ?? "?"}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(d.statement_balance)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${d.is_paid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
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
            <h2 className="text-base font-semibold text-text mb-3">Historial de servicios</h2>
            {historyService.length === 0 ? (
              <p className="text-sm text-text-muted">Sin datos históricos</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase border-b border-border">
                      <th className="text-left px-3 py-2">Mes</th>
                      <th className="text-left px-3 py-2">Servicio</th>
                      <th className="text-right px-3 py-2">Monto</th>
                      <th className="text-center px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyService.map(sp => {
                      const svc = services.find(s => s.id === sp.service_id);
                      return (
                        <tr key={sp.id} className="border-b border-border/50">
                          <td className="px-3 py-2 text-text-muted">{monthLabel(sp.month)}</td>
                          <td className="px-3 py-2 font-medium">{svc?.name ?? "?"}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(sp.amount)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${sp.is_paid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
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
    </div>
  );
}

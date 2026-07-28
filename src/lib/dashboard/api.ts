import { fetchList, safeFetch } from "@/lib/safeFetch.ts";
import { lastDayOfMonth, isInstallmentInMonth } from "@/lib/date.ts";
import type { DashboardMonthData, DashboardHistory, PayCardDebtPartialArgs } from "@/lib/types/dashboard.ts";
import type { CardWithDebt } from "@/lib/types/dashboard.ts";
import type { CardMonthly, CalculatedDebt } from "@/lib/types/card-monthly.ts";
import type { RecurringPayment, RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";
import type { Transaction } from "@/lib/types/transaction.ts";
import type { Cashback } from "@/lib/types/cashback.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { Event } from "@/lib/types/event.ts";
import type { Task } from "@/lib/types/task.ts";
import type { ShoppingItem } from "@/lib/types/shopping.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchDashboardMonth(month: string): Promise<DashboardMonthData> {
  const today = new Date().toLocaleDateString("sv");
  const thirtyLater = new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv");
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);

  const [cards, services, cardDebtsRaw, servicePayments, txDataArr, installments, eventsData, tasksData, shoppingData, cbData, paymentMethods, categories] =
    await Promise.all([
      fetchList<CardWithDebt>("/api/cards"),
      fetchList<RecurringPayment>("/api/recurring-payments"),
      fetchList<CardMonthly>(`/api/card-monthly?month=${month}`),
      fetchList<RecurringPaymentMonthly>(`/api/recurring-payment-monthly?month=${month}`),
      fetchList<Transaction>(`/api/transactions?page=1&pageSize=100&date_from=${monthStart}&date_to=${monthEnd}`),
      fetchList<Installment>("/api/installments?active_only=true"),
      fetchList<Event>(`/api/events?date_from=${today}&date_to=${thirtyLater}&status=pending,confirmed&pageSize=20`),
      fetchList<Task>("/api/tasks?is_completed=false"),
      fetchList<ShoppingItem>("/api/shopping?is_completed=false"),
      fetchList<Cashback>(`/api/cashback?date_from=${monthStart}&date_to=${monthEnd}`),
      fetchList<PaymentMethod>("/api/payment-methods"),
      fetchList<Category>("/api/categories"),
    ]);

  const installmentTotal = installments
    .filter((i) => isInstallmentInMonth(month, i.start_date, i.total_months))
    .reduce((sum, i) => sum + Number(i.monthly_amount), 0);

  const incomeSvcs = servicePayments.filter((sp) => sp.type === "income");
  const expenseSvcs = servicePayments.filter((sp) => sp.type === "expense");

  const incomes =
    txDataArr.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) +
    cbData.reduce((sum, cb) => sum + Number(cb.amount), 0) +
    incomeSvcs.reduce((sum, sp) => sum + Number(sp.amount), 0);
  const expenses =
    txDataArr.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) +
    installmentTotal +
    expenseSvcs.reduce((sum, sp) => sum + Number(sp.amount), 0);

  const calculatedDebts: Record<string, CalculatedDebt> = {};
  await Promise.all(
    cards
      .filter((card) => card.type === "credit")
      .map(async (card) => {
        const calc = await safeFetch<CalculatedDebt>(`/api/card-monthly/calculate?cardId=${card.id}&month=${month}`);
        if (calc) calculatedDebts[card.id] = calc;
      })
  );

  // Re-fetch card debts so balances reflect any recalculation side effects.
  const cardDebts = await fetchList<CardMonthly>(`/api/card-monthly?month=${month}`);

  return {
    cards,
    services,
    cardDebts: cardDebts.length > 0 ? cardDebts : cardDebtsRaw,
    servicePayments,
    upcomingEvents: eventsData,
    pendingTasks: tasksData.filter((t) => !t.due_date || t.due_date >= today),
    overdueTasks: tasksData.filter((t) => !!t.due_date && t.due_date < today),
    activeShopping: shoppingData,
    paymentMethods,
    categories,
    calculatedDebts,
    incomes,
    expenses,
    recentTx: txDataArr.slice(0, 5),
    installmentTotal,
    installments,
  };
}

export async function fetchDashboardHistory(): Promise<DashboardHistory> {
  const [card, service] = await Promise.all([
    fetchList<CardMonthly>("/api/card-monthly/history"),
    fetchList<RecurringPaymentMonthly>("/api/recurring-payment-monthly/history"),
  ]);
  return { card, service };
}

export async function payCardDebtFull(id: string, paidAt?: string): Promise<boolean> {
  return safeFetch("/api/card-monthly", {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, is_paid: true, paid_at: paidAt }),
  });
}

/** Marks the debt as paid and registers the remaining balance as an expense on the next month's closing day. */
export async function payCardDebtPartial(args: PayCardDebtPartialArgs): Promise<boolean> {
  const remaining = args.statementBalance - args.paidAmount;
  if (remaining <= 0) return payCardDebtFull(args.id, args.paidAt);

  const paid = await payCardDebtFull(args.id, args.paidAt);
  if (!paid) return false;

  const [year, monthNum] = args.month.split("-").map(Number);
  const nextYear = monthNum === 12 ? year + 1 : year;
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const day = args.cutoffDay ?? 1;
  const date = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return safeFetch("/api/transactions", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      type: "expense",
      amount: remaining,
      payment_method_id: args.paymentMethodId,
      category_id: args.categoryId,
      description: `Saldo pendiente ${args.month}`,
      date,
    }),
  });
}

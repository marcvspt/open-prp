import { addMonths, cardStatementPeriod, lastDayOfMonth } from "@/lib/date.ts";
import { CardRepository } from "@/lib/modules/cards/repository.ts";
import { RecurringPaymentRepository } from "@/lib/modules/recurring-payments/repository.ts";
import { CardMonthlyRepository } from "@/lib/modules/card-monthly/repository.ts";
import { RecurringPaymentMonthlyRepository } from "@/lib/modules/recurring-payment-monthly/repository.ts";
import { TransactionRepository } from "@/lib/modules/transactions/repository.ts";
import { InstallmentRepository } from "@/lib/modules/installments/repository.ts";
import { EventRepository } from "@/lib/modules/events/repository.ts";
import { TaskRepository } from "@/lib/modules/tasks/repository.ts";
import { ShoppingRepository } from "@/lib/modules/shopping/repository.ts";
import { CashbackRepository } from "@/lib/modules/cashback/repository.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";
import type { DashboardMonthData } from "@/lib/types/dashboard.ts";

/** Loads calendar activity and statement-based credit expenses directly from repositories. */
export async function loadDashboardMonth(userId: string, month: string): Promise<DashboardMonthData> {
  const today = new Date().toLocaleDateString("sv");
  const thirtyLater = new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv");
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);
  // A credit statement can include purchases and cashback from the previous month.
  const dateFrom = addMonths(monthStart, -1);

  const cardMonthlyRepo = new CardMonthlyRepository();

  const [cards, services, cardDebtsRaw, servicePayments, txDataResult, installments, eventsResult, tasksData, shoppingData, cbData, paymentMethods, categories] =
    await Promise.all([
      new CardRepository().findAll(userId),
      new RecurringPaymentRepository().findAll(userId),
      cardMonthlyRepo.findByMonth(month, userId),
      new RecurringPaymentMonthlyRepository().findByMonth(month, userId),
      new TransactionRepository().findAll(userId, { date_from: dateFrom, date_to: monthEnd, pageSize: null }),
      new InstallmentRepository().findSummaryByMonth(userId, month),
      new EventRepository().findAll(userId, { status: "pending,confirmed", date_from: today, date_to: thirtyLater, page: 1, pageSize: 20 }),
      new TaskRepository().findAll(userId, { is_completed: false }),
      new ShoppingRepository().findAll(userId, { is_completed: false }),
      new CashbackRepository().findAll(userId, { date_from: dateFrom, date_to: monthEnd }),
      new PaymentMethodRepository().findAll(userId),
      new CategoryRepository().findAll(userId),
    ]);

  const pmToCard = new Map(paymentMethods.filter(pm => pm.card_id).map(pm => [pm.id, pm.card_id]));
  const creditPeriods = new Map(cards.filter(card => card.type === "credit")
    .map(card => [card.id, cardStatementPeriod(month, card.cutoff_day)]));

  function isInCalendarMonth(date: string): boolean {
    return date >= monthStart && date <= monthEnd;
  }

  function isInCardPeriod(date: string, cardId: string | null | undefined): boolean {
    const period = creditPeriods.get(cardId ?? "");
    return period ? date >= period.start && date <= period.end : isInCalendarMonth(date);
  }

  const calendarTx = txDataResult.data.filter(tx => isInCalendarMonth(tx.date));
  const balanceTx = txDataResult.data.filter(tx => tx.type === "expense"
    ? isInCardPeriod(tx.date, pmToCard.get(tx.payment_method_id))
    : isInCalendarMonth(tx.date));
  const balanceCashback = cbData.filter(cb => isInCardPeriod(cb.date, cb.card_id));
  const installmentTotal = installments
    .reduce((sum, i) => sum + Number(i.monthly_amount), 0);

  const incomeSvcs = servicePayments.filter((sp) => sp.type === "income");
  const expenseSvcs = servicePayments.filter((sp) => sp.type === "expense");

  const carriedOut = cardDebtsRaw
    .filter((d) => d.is_paid)
    .reduce((sum, d) => sum + Math.max(0, d.statement_balance - d.paid_amount), 0);

  const incomes =
    balanceTx.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) +
    balanceCashback.reduce((sum, cb) => sum + Number(cb.amount), 0) +
    incomeSvcs.reduce((sum, sp) => sum + Number(sp.amount), 0);
  const expenses =
    balanceTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) +
    installmentTotal +
    expenseSvcs.reduce((sum, sp) => sum + Number(sp.amount), 0) -
    carriedOut;

  const cardTotals: Record<string, { income: number; expense: number }> = {};
  for (const tx of balanceTx) {
    const cardId = pmToCard.get(tx.payment_method_id ?? "");
    if (!cardId) continue;
    if (!cardTotals[cardId]) cardTotals[cardId] = { income: 0, expense: 0 };
    if (tx.type === "income") cardTotals[cardId].income += Number(tx.amount);
    else cardTotals[cardId].expense += Number(tx.amount);
  }
  for (const cb of balanceCashback) {
    if (!cardTotals[cb.card_id]) cardTotals[cb.card_id] = { income: 0, expense: 0 };
    cardTotals[cb.card_id].income += Number(cb.amount);
  }

  return {
    cards,
    services,
    cardDebts: cardDebtsRaw,
    servicePayments,
    upcomingEvents: eventsResult.data,
    pendingTasks: tasksData.filter((t) => !t.due_date || t.due_date >= today),
    overdueTasks: tasksData.filter((t) => !!t.due_date && t.due_date < today),
    activeShopping: shoppingData,
    paymentMethods,
    categories,
    calculatedDebts: {},
    cardTotals,
    incomes,
    expenses,
    recentTx: calendarTx.slice(0, 5),
    installmentTotal,
    installments,
  };
}

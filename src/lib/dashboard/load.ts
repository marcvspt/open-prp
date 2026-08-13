import { lastDayOfMonth, isInstallmentInMonth } from "@/lib/date.ts";
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

/** Server-side equivalent of `fetchDashboardMonth` (api.ts): same queries via repositories, without HTTP round-trips. */
export async function loadDashboardMonth(userId: string, month: string): Promise<DashboardMonthData> {
  const today = new Date().toLocaleDateString("sv");
  const thirtyLater = new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv");
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);

  const cardMonthlyRepo = new CardMonthlyRepository();

  const [cards, services, cardDebtsRaw, servicePayments, txDataArr, installments, eventsResult, tasksData, shoppingData, cbData, paymentMethods, categories] =
    await Promise.all([
      new CardRepository().findAll(userId),
      new RecurringPaymentRepository().findAll(userId),
      cardMonthlyRepo.findByMonth(month, userId),
      new RecurringPaymentMonthlyRepository().findByMonth(month, userId),
      new TransactionRepository().findAll(userId, { date_from: monthStart, date_to: monthEnd }),
      new InstallmentRepository().findAll(userId, { active_only: true }),
      new EventRepository().findAll(userId, { status: "pending,confirmed", date_from: today, date_to: thirtyLater, page: 1, pageSize: 20 }),
      new TaskRepository().findAll(userId, { is_completed: false }),
      new ShoppingRepository().findAll(userId, { is_completed: false }),
      new CashbackRepository().findAll(userId, { date_from: monthStart, date_to: monthEnd }),
      new PaymentMethodRepository().findAll(userId),
      new CategoryRepository().findAll(userId),
    ]);

  const installmentTotal = installments
    .filter((i) => isInstallmentInMonth(month, i.start_date, i.total_months))
    .reduce((sum, i) => sum + Number(i.monthly_amount), 0);

  const incomeSvcs = servicePayments.filter((sp) => sp.type === "income");
  const expenseSvcs = servicePayments.filter((sp) => sp.type === "expense");

  const carriedOut = cardDebtsRaw
    .filter((d) => d.is_paid)
    .reduce((sum, d) => sum + Math.max(0, d.statement_balance - d.paid_amount), 0);

  const incomes =
    txDataArr.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) +
    cbData.reduce((sum, cb) => sum + Number(cb.amount), 0) +
    incomeSvcs.reduce((sum, sp) => sum + Number(sp.amount), 0);
  const expenses =
    txDataArr.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) +
    installmentTotal +
    expenseSvcs.reduce((sum, sp) => sum + Number(sp.amount), 0) -
    carriedOut;

  const cardTotals: Record<string, { income: number; expense: number }> = {};
  const pmToCard = new Map(paymentMethods.filter(pm => pm.card_id).map(pm => [pm.id, pm.card_id]));
  for (const tx of txDataArr) {
    const cardId = pmToCard.get(tx.payment_method_id ?? "");
    if (!cardId) continue;
    if (!cardTotals[cardId]) cardTotals[cardId] = { income: 0, expense: 0 };
    if (tx.type === "income") cardTotals[cardId].income += Number(tx.amount);
    else cardTotals[cardId].expense += Number(tx.amount);
  }
  for (const cb of cbData) {
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
    recentTx: txDataArr.slice(0, 5),
    installmentTotal,
    installments,
  };
}

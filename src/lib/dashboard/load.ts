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
import { groupCategoryExpenses } from "@/lib/dashboard/category-expenses.ts";
import { summarizeMonthlyActivity } from "@/lib/dashboard/monthly-activity.ts";
import { summarizeDashboardCardDebts } from "@/lib/dashboard/card-debts.ts";
import { isCardCarryover } from "@/lib/modules/card-monthly/carryover.ts";
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

  const [cards, services, cardStatements, monthlyPayments, txDataResult, installments, eventsResult, tasksData, shoppingData, cbData, paymentMethods, categories] =
    await Promise.all([
      new CardRepository().findAll(userId),
      new RecurringPaymentRepository().findAll(userId),
      cardMonthlyRepo.findByMonth(month, userId),
      new RecurringPaymentMonthlyRepository().findByMonth(month, userId, { includeInactivePaid: true }),
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
  const creditPeriods = new Map(cards.filter(card => card.type === "credit" && card.cutoff_day != null)
    .map(card => [card.id, cardStatementPeriod(month, card.cutoff_day)]));

  function isInCalendarMonth(date: string): boolean {
    return date >= monthStart && date <= monthEnd;
  }

  function isInCardPeriod(date: string, cardId: string | null | undefined): boolean {
    const period = creditPeriods.get(cardId ?? "");
    return period ? date >= period.start && date <= period.end : isInCalendarMonth(date);
  }

  const balanceTx = txDataResult.data.filter(tx => tx.type === "expense"
    ? isInCardPeriod(tx.date, pmToCard.get(tx.payment_method_id))
    : isInCalendarMonth(tx.date));
  const balanceCashback = cbData.filter(cb => isInCardPeriod(cb.date, cb.card_id));
  const installmentTotal = installments
    .reduce((sum, i) => sum + Number(i.monthly_amount), 0);

  const servicePayments = monthlyPayments.filter(payment => payment.is_active);
  const incomeSvcs = servicePayments.filter((sp) => sp.type === "income");
  const recurringExpenses = servicePayments.filter((sp) => sp.type === "expense");
  const recurringExpensesTotal = recurringExpenses.reduce((sum, sp) => sum + Number(sp.amount), 0);
  const transactionExpenses = balanceTx.filter((tx) => tx.type === "expense");
  const cardDebts = summarizeDashboardCardDebts({
    cards,
    statements: cardStatements,
    paymentMethodCards: pmToCard,
    expenses: transactionExpenses,
    installments,
    recurring: monthlyPayments,
    cashback: balanceCashback,
  });
  const analyticsTransactions = balanceTx.filter(tx => {
    if (tx.type !== "expense" || !isCardCarryover(tx.description)) return true;
    const category = categories.find(category => category.id === tx.category_id);
    return !!category && category.name !== "card-balance";
  });

  const carriedOut = cardStatements
    .filter((d) => d.is_paid)
    .reduce((sum, d) => sum + Math.max(0, d.statement_balance - d.paid_amount), 0);

  const incomes =
    balanceTx.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) +
    balanceCashback.reduce((sum, cb) => sum + Number(cb.amount), 0) +
    incomeSvcs.reduce((sum, sp) => sum + Number(sp.amount), 0);
  const expenses =
    transactionExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0) +
    installmentTotal +
    recurringExpensesTotal -
    carriedOut;

  return {
    cards,
    services,
    cardDebts,
    upcomingEvents: eventsResult.data,
    pendingTasks: tasksData.filter((t) => !t.due_date || t.due_date >= today),
    overdueTasks: tasksData.filter((t) => !!t.due_date && t.due_date < today),
    activeShopping: shoppingData,
    incomes,
    expenses,
    installmentTotal,
    recurringExpensesTotal,
    categoryExpenses: groupCategoryExpenses(
      categories, analyticsTransactions.filter(tx => tx.type === "expense"), installments, recurringExpenses,
    ),
    ...summarizeMonthlyActivity(month, {
      categories,
      cards,
      paymentMethods,
      transactions: analyticsTransactions,
      installments,
      recurring: servicePayments,
      cashback: balanceCashback,
      statementForMethod: id => creditPeriods.get(pmToCard.get(id) ?? ""),
    }),
  };
}

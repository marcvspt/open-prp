import { addMonths, installmentFirstMonth, lastDayOfMonth, type cardStatementPeriod } from "@/lib/date.ts";
import type { Cashback } from "@/lib/types/cashback.ts";
import type { Card } from "@/lib/types/card.ts";
import type { Category } from "@/lib/types/category.ts";
import type { DailyActivityGroup, DailyAmounts, MovementRanking, PaymentMethodActivity, RankedMovement } from "@/lib/types/dashboard.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";
import type { Transaction } from "@/lib/types/transaction.ts";

interface MonthlyActivity {
  categories: Category[];
  cards: Card[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  installments: Installment[];
  recurring: RecurringPaymentMonthly[];
  cashback: Cashback[];
  statementForMethod: (id: string) => ReturnType<typeof cardStatementPeriod> | undefined;
}

interface ActivityGroup {
  currency: string;
  firstDay: string;
  lastDay: string;
  amountsByDay: Map<string, DailyAmounts>;
  rankings: Record<keyof DailyAmounts, RankedMovement[]>;
  paymentMethods: Map<string, PaymentMethodActivity>;
}

const MAX_RANKING_SLICES = 10;

function rankMovements(movements: RankedMovement[]): MovementRanking {
  const sorted = movements.sort((a, b) => b.amount - a.amount);
  const individualCount = sorted.length > MAX_RANKING_SLICES ? MAX_RANKING_SLICES - 1 : MAX_RANKING_SLICES;
  const rest = sorted.slice(individualCount);
  return {
    movements: sorted.slice(0, individualCount),
    remainder: { count: rest.length, amount: rest.reduce((sum, row) => sum + row.amount, 0) },
  };
}

export function summarizeMonthlyActivity(month: string, activity: MonthlyActivity) {
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);
  const previousMonth = addMonths(monthStart, -1).slice(0, 7);
  const groups = new Map<string, ActivityGroup>();
  const categories = new Map(activity.categories.map(category => [category.id, category]));
  const cards = new Map(activity.cards.map(card => [card.id, card]));
  const methods = new Map(activity.paymentMethods.map(method => [method.id, method]));

  function add(
    type: keyof DailyAmounts,
    source: RankedMovement["source"],
    row: {
      amount: number;
      currency?: string;
      description?: string | null;
      category_id?: string | null;
      payment_method_id?: string;
      card_id?: string;
    },
    date?: string,
  ) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount === 0) return;
    const code = row.currency?.trim().toUpperCase() || "MXN";
    let group = groups.get(code);
    if (!group) {
      group = {
        currency: code,
        firstDay: monthStart,
        lastDay: monthEnd,
        amountsByDay: new Map(),
        rankings: { income: [], expense: [] },
        paymentMethods: new Map(),
      };
      groups.set(code, group);
    }
    if (date && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date) && date <= lastDayOfMonth(date.slice(0, 7))) {
      if (date < group.firstDay) group.firstDay = date;
      if (date > group.lastDay) group.lastDay = date;
      const day = group.amountsByDay.get(date) ?? { income: 0, expense: 0 };
      day[type] += amount;
      group.amountsByDay.set(date, day);
    }

    const method = methods.get(row.payment_method_id ?? "");
    const card = cards.get(row.card_id ?? method?.card_id ?? "");
    const cardKey = card && (type === "expense" ? `card-id:${card.id}` : `card:${card.type}`);
    const methodKey = cardKey ?? method?.id ?? "unassigned";
    let methodActivity = group.paymentMethods.get(methodKey);
    if (!methodActivity) {
      methodActivity = {
        key: methodKey,
        cardName: type === "expense" ? card?.name : undefined,
        cardType: card?.type,
        method: method && !card ? { name: method.name, type: method.type } : undefined,
        income: 0,
        expense: 0,
      };
      group.paymentMethods.set(methodKey, methodActivity);
    }
    methodActivity[type] += amount;

    if (amount > 0) {
      const category = categories.get(row.category_id ?? "");
      group.rankings[type].push({
        amount,
        source,
        description: row.description?.trim() ? row.description : null,
        category: category ? { name: category.name, type: category.type } : null,
      });
    }
  }

  for (const tx of activity.transactions) {
    add(tx.type, "transaction", tx, tx.date);
  }
  for (const cashback of activity.cashback) {
    add("income", "cashback", cashback, cashback.date);
  }
  for (const plan of activity.installments) {
    const statement = activity.statementForMethod(plan.payment_method_id);
    const card = cards.get(methods.get(plan.payment_method_id)?.card_id ?? "");
    const purchaseMonth = plan.start_date.slice(0, 7);
    const postsNextMonth = statement && installmentFirstMonth(plan.start_date, card?.cutoff_day) !== purchaseMonth;
    const scheduledMonth = postsNextMonth ? previousMonth : month;
    const scheduledDate = addMonths(`${scheduledMonth}-${plan.start_date.slice(8, 10)}`, 0);
    // A short month can move the clamped purchase day outside its statement period.
    const date = statement && scheduledDate < statement.start ? statement.start : scheduledDate;
    add("expense", "installment", { ...plan, amount: plan.monthly_amount }, date);
  }
  for (const payment of activity.recurring) {
    const statement = payment.type === "expense" ? activity.statementForMethod(payment.payment_method_id) : undefined;
    const scheduledDate = payment.scheduled_day == null
      ? undefined
      : addMonths(`${payment.month}-${String(payment.scheduled_day).padStart(2, "0")}`, 0);
    add(payment.type, "recurring", { ...payment, description: payment.name }, statement?.end ?? scheduledDate);
  }

  const ordered = [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency));
  return {
    dailyActivity: ordered.map(({ currency, firstDay, lastDay, amountsByDay }) => {
      const days: DailyActivityGroup["days"] = [];
      const end = new Date(`${lastDay}T00:00:00Z`);
      for (const day = new Date(`${firstDay}T00:00:00Z`); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
        const date = day.toISOString().slice(0, 10);
        days.push({ date, ...(amountsByDay.get(date) ?? { income: 0, expense: 0 }) });
      }
      return { currency, days };
    }),
    movementBreakdown: ordered.map(({ currency, rankings, paymentMethods }) => ({
      currency,
      income: rankMovements(rankings.income),
      expense: rankMovements(rankings.expense),
      paymentMethods: [...paymentMethods.values()],
    })),
  };
}

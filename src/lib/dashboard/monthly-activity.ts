import { lastDayOfMonth } from "@/lib/date.ts";
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
  cutoffForCard: (id: string) => string | undefined;
  cutoffForMethod: (id: string) => string | undefined;
}

interface ActivityGroup extends DailyActivityGroup {
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
  const lastDay = Number(lastDayOfMonth(month).slice(8));
  const dates = Array.from({ length: lastDay }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
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
        days: dates.map(date => ({ date, income: 0, expense: 0 })),
        undated: { income: 0, expense: 0 },
        rankings: { income: [], expense: [] },
        paymentMethods: new Map(),
      };
      groups.set(code, group);
    }
    const day = date ? group.days[Number(date.slice(8, 10)) - 1] : undefined;
    const bucket = day && day.date === date ? day : group.undated;
    bucket[type] += amount;

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
    const cutoff = tx.type === "expense" ? activity.cutoffForMethod(tx.payment_method_id) : undefined;
    add(tx.type, "transaction", tx, cutoff ?? tx.date);
  }
  for (const cashback of activity.cashback) {
    add("income", "cashback", cashback, activity.cutoffForCard(cashback.card_id) ?? cashback.date);
  }
  for (const plan of activity.installments) {
    const day = Math.min(Number(plan.start_date.slice(8, 10)), lastDay);
    const scheduledDate = dates[day - 1];
    add("expense", "installment", { ...plan, amount: plan.monthly_amount }, activity.cutoffForMethod(plan.payment_method_id) ?? scheduledDate);
  }
  for (const payment of activity.recurring) {
    const cutoff = payment.type === "expense" ? activity.cutoffForMethod(payment.payment_method_id) : undefined;
    const paidDate = payment.is_paid ? payment.paid_at?.slice(0, 10) : undefined;
    add(payment.type, "recurring", { ...payment, description: payment.name }, cutoff ?? paidDate);
  }

  const ordered = [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency));
  return {
    dailyActivity: ordered.map(({ currency, days, undated }) => ({ currency, days, undated })),
    movementBreakdown: ordered.map(({ currency, rankings, paymentMethods }) => ({
      currency,
      income: rankMovements(rankings.income),
      expense: rankMovements(rankings.expense),
      paymentMethods: [...paymentMethods.values()],
    })),
  };
}

import type { Card } from "@/lib/types/card.ts";
import type { CardMonthly } from "@/lib/types/card-monthly.ts";
import type { RecurringPayment } from "@/lib/types/recurring-payment.ts";
import type { Event } from "@/lib/types/event.ts";
import type { Task } from "@/lib/types/task.ts";
import type { ShoppingItem } from "@/lib/types/shopping.ts";
import type { Category } from "@/lib/types/category.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";

export interface CategoryExpense {
  categoryId: string | null;
  category: Pick<Category, "name" | "type"> | null;
  transactions: number;
  installments: number;
  recurring: number;
  total: number;
}

export interface CategoryExpenseGroup {
  currency: string;
  categories: CategoryExpense[];
}

export interface DailyAmounts {
  income: number;
  expense: number;
}

export interface DailyActivityGroup {
  currency: string;
  days: Array<DailyAmounts & { date: string }>;
  undated: DailyAmounts;
}

export interface RankedMovement {
  amount: number;
  description: string | null;
  category: CategoryExpense["category"];
  source: "transaction" | "installment" | "recurring" | "cashback";
}

export interface MovementRanking {
  movements: RankedMovement[];
  remainder: { count: number; amount: number };
}

export interface PaymentMethodActivity extends DailyAmounts {
  key: string;
  cardName?: string;
  cardType?: Card["type"];
  method?: Pick<PaymentMethod, "name" | "type">;
}

export interface MovementBreakdownGroup {
  currency: string;
  income: MovementRanking;
  expense: MovementRanking;
  paymentMethods: PaymentMethodActivity[];
}

export interface DashboardMonthData {
  cards: Card[];
  services: RecurringPayment[];
  cardDebts: CardMonthly[];
  upcomingEvents: Event[];
  pendingTasks: Task[];
  overdueTasks: Task[];
  activeShopping: ShoppingItem[];
  incomes: number;
  expenses: number;
  installmentTotal: number;
  recurringExpensesTotal: number;
  categoryExpenses: CategoryExpenseGroup[];
  dailyActivity: DailyActivityGroup[];
  movementBreakdown: MovementBreakdownGroup[];
}

export interface PayCardDebtPartialArgs {
  id: string;
  month: string;
  statementBalance: number;
  paidAmount: number;
  cutoffDay: number | null;
  paymentMethodId: string | null;
  categoryId: string | null;
  paidAt?: string;
}

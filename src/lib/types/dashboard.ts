import type { Card } from "@/lib/types/card.ts";
import type { CardMonthly } from "@/lib/types/card-monthly.ts";
import type { RecurringPayment } from "@/lib/types/recurring-payment.ts";
import type { Event } from "@/lib/types/event.ts";
import type { Task } from "@/lib/types/task.ts";
import type { ShoppingItem } from "@/lib/types/shopping.ts";

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

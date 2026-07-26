import type { CreditCard } from "@/lib/types/credit-card.ts";
import type { CardMonthly, CalculatedDebt } from "@/lib/types/card-monthly.ts";
import type { RecurringPayment, RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";
import type { Transaction } from "@/lib/types/transaction.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { Event } from "@/lib/types/event.ts";
import type { Task } from "@/lib/types/task.ts";
import type { ShoppingItem } from "@/lib/types/shopping.ts";
import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";

export interface CardWithDebt extends CreditCard {
  debt?: CardMonthly;
}

export interface DashboardMonthData {
  cards: CardWithDebt[];
  services: RecurringPayment[];
  cardDebts: CardMonthly[];
  servicePayments: RecurringPaymentMonthly[];
  upcomingEvents: Event[];
  pendingTasks: Task[];
  overdueTasks: Task[];
  activeShopping: ShoppingItem[];
  paymentMethods: PaymentMethod[];
  categories: Category[];
  calculatedDebts: Record<string, CalculatedDebt>;
  incomes: number;
  expenses: number;
  recentTx: Transaction[];
  installmentTotal: number;
  installments: Installment[];
}

export interface DashboardHistory {
  card: CardMonthly[];
  service: RecurringPaymentMonthly[];
}

export interface PayCardDebtPartialArgs {
  id: string;
  month: string;
  statementBalance: number;
  paidAmount: number;
  cutoffDay: number | null;
  paymentMethodId: string | null;
  categoryId: string | null;
}

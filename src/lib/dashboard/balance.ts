import type { DashboardBalance, DashboardCardDebt } from "@/lib/types/dashboard.ts";
import type { Transaction } from "@/lib/types/transaction.ts";
import type { Cashback } from "@/lib/types/cashback.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";

interface BalanceSources {
  transactions: Pick<Transaction, "currency" | "amount" | "type">[];
  cashback: Pick<Cashback, "currency" | "amount">[];
  installments: Pick<Installment, "currency" | "monthly_amount">[];
  recurring: Pick<RecurringPaymentMonthly, "currency" | "amount" | "type">[];
  cardDebts: DashboardCardDebt[];
}

export function summarizeDashboardBalances({ transactions, cashback, installments, recurring, cardDebts }: BalanceSources) {
  const groups = new Map<string, DashboardBalance>();
  function getBalance(currency: string) {
    let balance = groups.get(currency);
    if (!balance) {
      balance = { currency, income: 0, expense: 0, installments: 0, recurringExpenses: 0 };
      groups.set(currency, balance);
    }
    return balance;
  }

  for (const transaction of transactions) getBalance(transaction.currency)[transaction.type] += Number(transaction.amount);
  for (const reward of cashback) getBalance(reward.currency).income += Number(reward.amount);
  for (const installment of installments) {
    const balance = getBalance(installment.currency);
    balance.installments += Number(installment.monthly_amount);
    balance.expense += Number(installment.monthly_amount);
  }
  for (const payment of recurring) {
    const balance = getBalance(payment.currency);
    balance[payment.type] += Number(payment.amount);
    if (payment.type === "expense") balance.recurringExpenses += Number(payment.amount);
  }

  let hasUnassignedCarryover = false;
  for (const statement of cardDebts) {
    if (!statement.is_paid || statement.statement_balance <= statement.paid_amount) continue;
    if (!statement.currency) {
      hasUnassignedCarryover = true;
      continue;
    }
    getBalance(statement.currency).expense -= statement.statement_balance - statement.paid_amount;
  }
  return { balances: [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency)), hasUnassignedCarryover };
}

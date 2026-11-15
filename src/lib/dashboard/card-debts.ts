import { calculateStatementBalance } from "@/lib/modules/card-monthly/statement-balance.ts";
import type { Card } from "@/lib/types/card.ts";
import type { StatementAmounts } from "@/lib/types/card-monthly.ts";
import type { Cashback } from "@/lib/types/cashback.ts";
import type { DashboardCardDebt } from "@/lib/types/dashboard.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";
import type { Transaction } from "@/lib/types/transaction.ts";

interface CardDebtSources {
  cards: readonly Pick<Card, "id" | "type">[];
  statements: Omit<DashboardCardDebt, "mixedCurrency">[];
  paymentMethodCards: ReadonlyMap<string, string | null>;
  expenses: Pick<Transaction, "payment_method_id" | "amount" | "currency">[];
  installments: Pick<Installment, "payment_method_id" | "monthly_amount" | "currency">[];
  recurring: Pick<RecurringPaymentMonthly, "payment_method_id" | "amount" | "type" | "is_paid" | "currency">[];
  cashback: Pick<Cashback, "card_id" | "amount" | "currency">[];
}

/** Totals the movements already assigned to the selected statement month. */
export function summarizeDashboardCardDebts({
  cards, statements, paymentMethodCards, expenses, installments, recurring, cashback,
}: CardDebtSources): DashboardCardDebt[] {
  const creditCardIds = new Set(cards.filter(card => card.type === "credit").map(card => card.id));
  const statementsByCard = new Map(statements.map(statement => [statement.card_id, statement]));
  const amountsByCard = new Map<string, Map<string, StatementAmounts>>();

  function add(cardId: string | null | undefined, currency: string, source: keyof StatementAmounts, amount: number) {
    if (!cardId || !creditCardIds.has(cardId)) return;
    let currencies = amountsByCard.get(cardId);
    if (!currencies) {
      currencies = new Map();
      amountsByCard.set(cardId, currencies);
    }
    let amounts = currencies.get(currency);
    if (!amounts) {
      amounts = { total_purchases: 0, total_installments: 0, total_recurring: 0, total_cashback: 0 };
      currencies.set(currency, amounts);
    }
    amounts[source] += Number(amount);
  }

  for (const expense of expenses) add(paymentMethodCards.get(expense.payment_method_id), expense.currency, "total_purchases", expense.amount);
  for (const installment of installments) add(paymentMethodCards.get(installment.payment_method_id), installment.currency, "total_installments", installment.monthly_amount);
  for (const payment of recurring) {
    if (payment.is_paid && payment.type === "expense") add(paymentMethodCards.get(payment.payment_method_id), payment.currency, "total_recurring", payment.amount);
  }
  for (const reward of cashback) add(reward.card_id, reward.currency, "total_cashback", reward.amount);

  return [...creditCardIds].flatMap<DashboardCardDebt>(cardId => {
    const statement = statementsByCard.get(cardId);
    if (statement?.is_paid) return [{ ...statement, mixedCurrency: false }];

    const currencies = amountsByCard.get(cardId);
    if (!currencies && !statement) return [];
    const [currency, amounts] = currencies?.entries().next().value ?? [null, null];
    const mixedCurrency = (currencies?.size ?? 0) > 1;
    return [{
      card_id: cardId,
      currency: mixedCurrency ? null : (currency || null),
      mixedCurrency,
      statement_balance: amounts && !mixedCurrency ? calculateStatementBalance(amounts) : 0,
      paid_amount: statement?.currency === currency ? statement?.paid_amount ?? 0 : 0,
      is_paid: false,
      paid_at: statement?.paid_at ?? null,
    }];
  });
}

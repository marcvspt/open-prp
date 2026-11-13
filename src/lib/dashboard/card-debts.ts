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
  statements: DashboardCardDebt[];
  paymentMethodCards: ReadonlyMap<string, string | null>;
  expenses: Pick<Transaction, "payment_method_id" | "amount">[];
  installments: Pick<Installment, "payment_method_id" | "monthly_amount">[];
  recurring: Pick<RecurringPaymentMonthly, "payment_method_id" | "amount" | "type" | "is_paid">[];
  cashback: Pick<Cashback, "card_id" | "amount">[];
}

/** Totals the movements already assigned to the selected statement month. */
export function summarizeDashboardCardDebts({
  cards, statements, paymentMethodCards, expenses, installments, recurring, cashback,
}: CardDebtSources): DashboardCardDebt[] {
  const creditCardIds = new Set(cards.filter(card => card.type === "credit").map(card => card.id));
  const statementsByCard = new Map(statements.map(statement => [statement.card_id, statement]));
  const amountsByCard = new Map<string, StatementAmounts>();

  function add(cardId: string | null | undefined, source: keyof StatementAmounts, amount: number) {
    if (!cardId || !creditCardIds.has(cardId)) return;
    let amounts = amountsByCard.get(cardId);
    if (!amounts) {
      amounts = { total_purchases: 0, total_installments: 0, total_recurring: 0, total_cashback: 0 };
      amountsByCard.set(cardId, amounts);
    }
    amounts[source] += Number(amount);
  }

  for (const expense of expenses) add(paymentMethodCards.get(expense.payment_method_id), "total_purchases", expense.amount);
  for (const installment of installments) add(paymentMethodCards.get(installment.payment_method_id), "total_installments", installment.monthly_amount);
  for (const payment of recurring) {
    if (payment.is_paid && payment.type === "expense") add(paymentMethodCards.get(payment.payment_method_id), "total_recurring", payment.amount);
  }
  for (const reward of cashback) add(reward.card_id, "total_cashback", reward.amount);

  return [...creditCardIds].flatMap(cardId => {
    const statement = statementsByCard.get(cardId);
    if (statement?.is_paid) return [statement];

    const amounts = amountsByCard.get(cardId);
    if (!amounts && !statement) return [];
    return [{
      card_id: cardId,
      statement_balance: amounts ? calculateStatementBalance(amounts) : 0,
      paid_amount: statement?.paid_amount ?? 0,
      is_paid: false,
      paid_at: statement?.paid_at ?? null,
    }];
  });
}

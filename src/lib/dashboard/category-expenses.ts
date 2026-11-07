import type { Category } from "@/lib/types/category.ts";
import type { CategoryExpense, CategoryExpenseGroup } from "@/lib/types/dashboard.ts";
import type { Installment } from "@/lib/types/installment.ts";
import type { RecurringPaymentMonthly } from "@/lib/types/recurring-payment.ts";
import type { Transaction } from "@/lib/types/transaction.ts";

type ExpenseSource = "transactions" | "installments" | "recurring";

/** Groups already scheduled expenses by currency and category. */
export function groupCategoryExpenses(
  categories: Category[],
  transactions: Transaction[],
  installments: Installment[],
  recurring: RecurringPaymentMonthly[],
): CategoryExpenseGroup[] {
  const categoriesById = new Map(categories.map(category => [category.id, category]));
  const groups = new Map<string, Map<string | null, CategoryExpense>>();

  function add(source: ExpenseSource, amount: number, currency: string, categoryId: string | null) {
    if (amount === 0) return;
    const category = categoriesById.get(categoryId ?? "");
    const key = category?.id ?? null;
    const code = currency.trim().toUpperCase() || "MXN";
    let group = groups.get(code);
    if (!group) {
      group = new Map();
      groups.set(code, group);
    }
    let row = group.get(key);
    if (!row) {
      row = {
        categoryId: key,
        category: category ? { name: category.name, type: category.type } : null,
        transactions: 0, installments: 0, recurring: 0, total: 0,
      };
      group.set(key, row);
    }
    row[source] += amount;
    row.total += amount;
  }

  for (const tx of transactions) add("transactions", Number(tx.amount), tx.currency, tx.category_id);
  for (const plan of installments) add("installments", Number(plan.monthly_amount), plan.currency, plan.category_id);
  for (const payment of recurring) add("recurring", payment.amount, payment.currency ?? "MXN", payment.category_id);

  return [...groups].map(([currency, group]) => ({
    currency,
    categories: [...group.values()].sort((a, b) => b.total - a.total),
  })).sort((a, b) => a.currency.localeCompare(b.currency));
}

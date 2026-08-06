import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";
import type { Card } from "@/lib/types/card.ts";
import type { Locale } from "@/lib/i18n/es.ts";
import { displayCategoryName } from "@/lib/i18n/category-labels.ts";
import { displayPaymentMethodName } from "@/lib/i18n/payment-method-labels.ts";

export function fieldTypeCurrency(t: Locale) {
  return {
    name: "currency",
    label: t.field.currency,
    type: "select" as const,
    options: t.currency.options,
  };
}

export function fieldType(t: Locale) {
  return {
    name: "type",
    label: t.field.type,
    type: "select" as const,
    required: true,
    options: [
      { value: "expense", label: t.badge.expenseOption },
      { value: "income", label: t.badge.incomeOption },
    ],
  };
}

export function paymentMethodField(t: Locale, paymentMethods: PaymentMethod[]) {
  return {
    name: "payment_method_id",
    label: t.field.method,
    type: "select" as const,
    required: true,
    options: paymentMethods.map(pm => ({
      value: pm.id,
      label: `${pm.icon || "💳"} ${displayPaymentMethodName(pm, t)}`,
    })),
  };
}

export function categoryField(t: Locale, categories: Category[]) {
  return {
    name: "category_id",
    label: t.field.category,
    type: "select" as const,
    options: [
      { value: "", label: t.field.noCategory },
      ...categories.map(c => ({
        value: c.id,
        label: `${c.icon || "📂"} ${displayCategoryName(c, t)}`,
      })),
    ],
  };
}

export function dateField(t: Locale, name: string = "date") {
  return {
    name,
    label: t.field.date,
    type: "date" as const,
    required: true,
  };
}

export function cardField(t: Locale, cards: Card[]) {
  const emoji = (type: string) =>
    type === "credit" ? "💳" : type === "debit" ? "🏦" : "🎫";
  return {
    name: "card_id",
    label: t.field.card,
    type: "select" as const,
    required: true,
    options: cards.length > 0
      ? cards.map(c => ({
          value: c.id,
          label: `${emoji(c.type)} ${c.name}`,
        }))
      : [{ value: "", label: t.field.noCreditCards }],
  };
}

import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";
import type { Card } from "@/lib/types/card.ts";
import { displayCategoryName } from "@/lib/category-labels.ts";
import { labels } from "@/lib/labels.ts";

export const CURRENCY_OPTIONS = labels.currency.options;

export const TYPE_OPTIONS = [
  { value: "expense", label: labels.badge.expenseOption },
  { value: "income", label: labels.badge.incomeOption },
];

export const FIELD_TYPE_CURRENCY = {
  name: "currency",
  label: labels.field.currency,
  type: "select" as const,
  options: CURRENCY_OPTIONS,
};

export const FIELD_TYPE = {
  name: "type",
  label: labels.field.type,
  type: "select" as const,
  required: true,
  options: TYPE_OPTIONS,
};

export function paymentMethodField(paymentMethods: PaymentMethod[]) {
  return {
    name: "payment_method_id",
    label: labels.field.method,
    type: "select" as const,
    required: true,
    options: paymentMethods.map(pm => ({
      value: pm.id,
      label: `${pm.icon || "💳"} ${pm.name}`,
    })),
  };
}

export function categoryField(categories: Category[]) {
  return {
    name: "category_id",
    label: labels.field.category,
    type: "select" as const,
    options: [
      { value: "", label: labels.field.noCategory },
      ...categories.map(c => ({
        value: c.id,
        label: `${c.icon || "📂"} ${displayCategoryName(c)}`,
      })),
    ],
  };
}

export function dateField(name: string = "date") {
  return {
    name,
    label: labels.field.date,
    type: "date" as const,
    required: true,
  };
}

export function cardField(cards: Card[]) {
  const emoji = (type: string) =>
    type === "credit" ? "💳" : type === "debit" ? "🏦" : "🎫";
  return {
    name: "card_id",
    label: labels.field.card,
    type: "select" as const,
    required: true,
    options: cards.map(c => ({
      value: c.id,
      label: `${emoji(c.type)} ${c.name}`,
    })),
  };
}

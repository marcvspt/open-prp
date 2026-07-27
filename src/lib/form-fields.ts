import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";
import type { Card } from "@/lib/types/card.ts";

export const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", MXN: "$", USD: "$" };

export const CURRENCY_OPTIONS = [
  { value: "EUR", label: "€ EUR" },
  { value: "MXN", label: "$ MXN" },
  { value: "USD", label: "$ USD" },
];

export const TYPE_OPTIONS = [
  { value: "expense", label: "💸 Gasto" },
  { value: "income", label: "📥 Ingreso" },
];

export const FIELD_TYPE_CURRENCY = {
  name: "currency",
  label: "Moneda",
  type: "select" as const,
  options: CURRENCY_OPTIONS,
};

export const FIELD_TYPE = {
  name: "type",
  label: "Tipo",
  type: "select" as const,
  required: true,
  options: TYPE_OPTIONS,
};

export function paymentMethodField(paymentMethods: PaymentMethod[]) {
  return {
    name: "payment_method_id",
    label: "Método de pago",
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
    label: "Categoría",
    type: "select" as const,
    options: [
      { value: "", label: "Sin categoría" },
      ...categories.map(c => ({
        value: c.id,
        label: `${c.icon || "📂"} ${c.name}`,
      })),
    ],
  };
}

export function cardField(cards: Card[]) {
  const emoji = (type: string) =>
    type === "credit" ? "💳" : type === "debit" ? "🏦" : "🎫";
  return {
    name: "card_id",
    label: "Tarjeta",
    type: "select" as const,
    required: true,
    options: cards.map(c => ({
      value: c.id,
      label: `${emoji(c.type)} ${c.name}`,
    })),
  };
}

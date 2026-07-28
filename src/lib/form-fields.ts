import type { PaymentMethod } from "@/lib/types/payment-method.ts";
import type { Category } from "@/lib/types/category.ts";
import type { Card } from "@/lib/types/card.ts";

export const INPUT_BASE = "mt-1 block w-full rounded-lg border border-border";
export const INPUT_PADDING = "px-3 py-2 text-sm";
export const INPUT_CLASS = `${INPUT_BASE} ${INPUT_PADDING}`;
export const COLOR_CLASS = `${INPUT_BASE} h-10 cursor-pointer`;

export const FILTER_WRAP_CLASS = "w-full sm:w-48";
export const FILTER_INPUT_CLASS = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-string w-full col-span-2 sm:w-48 sm:col-span-1";
export const FILTER_LIMPIAR_CLASS = "w-full col-span-2 sm:col-span-1 sm:w-auto px-3 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-danger hover:bg-danger-bg cursor-pointer";
export const FILTER_GRID_CLASS = "grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:items-end sm:flex-1";
export const FILTER_CTA_CLASS = "hidden sm:block sm:shrink-0 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover cursor-pointer";

export const BTN_EDIT = "Editar";
export const BTN_DELETE = "Eliminar";
export const BTN_CLEAR = "Limpiar búsqueda";
export const BTN_CANCEL = "Cancelar";
export const BTN_SAVE = "Guardar";
export const BTN_CREATE = "Crear";
export const BTN_SAVING = "Guardando…";
export const BTN_LOGIN = "Iniciar sesión";
export const BTN_SIGNUP = "Registrarse";

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

export function dateField(name: string = "date") {
  return {
    name,
    label: "Fecha",
    type: "date" as const,
    required: true,
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

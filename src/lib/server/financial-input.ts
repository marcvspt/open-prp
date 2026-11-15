import { lastDayOfMonth } from "@/lib/date.ts";
import type { ApiErrorCode } from "@/lib/types/api.ts";

export function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)
    && value <= lastDayOfMonth(value.slice(0, 7));
}

export function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER / 100;
}

export function isCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

export function validateMovement(body: Record<string, unknown>, kind: "transaction" | "cashback", creating: boolean): ApiErrorCode | null {
  const reference = kind === "transaction" ? "payment_method_id" : "card_id";
  if (creating && (body.amount == null || !body.date || !body[reference] || (kind === "transaction" && !body.type))) {
    return kind === "transaction" ? "transaction-fields-required" : "cashback-fields-required";
  }
  if (body.currency !== undefined && !isCurrency(body.currency)) return "invalid-currency";
  if (
    (body.amount !== undefined && !isAmount(body.amount)) ||
    (body.date !== undefined && !isDateOnly(body.date)) ||
    (body[reference] !== undefined && !isId(body[reference])) ||
    (body.description != null && typeof body.description !== "string") ||
    (kind === "transaction" && (
      (body.type !== undefined && body.type !== "income" && body.type !== "expense") ||
      (body.category_id != null && body.category_id !== "" && !isId(body.category_id))
    ))
  ) return "invalid-body";
  return null;
}

export function validateCard(body: Record<string, unknown>, creating: boolean): ApiErrorCode | null {
  if (creating && (!body.name || !body.type)) return "card-fields-required";
  if (body.type !== undefined && body.type !== "credit" && body.type !== "debit" && body.type !== "voucher") return "invalid-card-type";
  const invalidDay = (value: unknown) => value != null && (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 31);
  if (
    (body.name !== undefined && !isId(body.name)) ||
    (body.max_limit != null && (!isAmount(body.max_limit) || body.max_limit < 0)) ||
    invalidDay(body.cutoff_day) || invalidDay(body.payment_due_day) ||
    (body.color != null && typeof body.color !== "string")
  ) return "invalid-body";
  return null;
}

import { CardRepository } from "@/lib/modules/cards/repository.ts";
import { PaymentMethodRepository } from "@/lib/modules/payment-methods/repository.ts";
import { CategoryRepository } from "@/lib/modules/transactions/categories.ts";
import { isId, validateMovement } from "@/lib/server/financial-input.ts";
import type { ApiErrorCode } from "@/lib/types/api.ts";

export async function validateTransactionWrite(body: Record<string, unknown>, userId: string, creating: boolean): Promise<ApiErrorCode | null> {
  const error = validateMovement(body, "transaction", creating);
  if (error) return error;

  const { payment_method_id: methodId, category_id: categoryId } = body;
  const [method, category] = await Promise.all([
    isId(methodId) ? new PaymentMethodRepository().findById(methodId, userId) : null,
    isId(categoryId) ? new CategoryRepository().findById(categoryId, userId) : null,
  ]);
  if ((isId(methodId) && !method) || (isId(categoryId) && !category)) {
    return "invalid-financial-reference";
  }
  return null;
}

export async function validateCashbackWrite(body: Record<string, unknown>, userId: string, creating: boolean): Promise<ApiErrorCode | null> {
  const error = validateMovement(body, "cashback", creating);
  if (error) return error;
  if (isId(body.card_id) && !await new CardRepository().findById(body.card_id, userId)) {
    return "invalid-financial-reference";
  }
  return null;
}

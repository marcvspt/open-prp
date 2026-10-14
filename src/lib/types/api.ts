export const API_ERROR_CODES = [
  "internal-error", "unauthorized", "invalid-body", "not-found",
  "name-required", "description-required", "card-fields-required", "invalid-card-type",
  "transaction-fields-required", "event-fields-required", "cashback-fields-required",
  "installment-fields-required", "recurring-payment-fields-required", "month-required",
  "id-required", "card-month-required", "month-amount-required", "invalid-currency",
  "category-exists", "predefined-category-readonly", "database-unavailable",
  "pantry-create-failed", "card-calculation-failed", "month-unavailable",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorParams {
  name?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorCode;
  params?: ApiErrorParams;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && API_ERROR_CODES.some((code) => code === value);
}

export type { User } from "@/types/user.ts";
export type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from "@/types/transaction.ts";
export type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types/category.ts";
export type { PantryItem, PantryItemInput, PantryItemUpdate, PantryFilter } from "@/types/pantry.ts";
export type { Note, CreateNoteInput, UpdateNoteInput, NoteFilter } from "@/types/note.ts";
export type { NoteTag } from "@/types/note.ts";
export type { Event, CreateEventInput, UpdateEventInput, EventFilter } from "@/types/event.ts";
export type { CreditCard, CreditCardInput } from "@/types/credit-card.ts";
export type { Installment, InstallmentInput, InstallmentFilter } from "@/types/installment.ts";
export type { RecurringPayment, RecurringPaymentInput, RecurringPaymentMonthly, RecurringPaymentMonthlyUpdate } from "@/types/recurring-payment.ts";
export type { Cashback, CashbackInput } from "@/types/cashback.ts";
export type { ShoppingItem, ShoppingItemInput, ShoppingItemUpdate, ShoppingFilter } from "@/types/shopping.ts";
export type { PaymentMethod, CreatePaymentMethodInput, UpdatePaymentMethodInput } from "@/types/payment-method.ts";
export type { CardMonthly, CardMonthlyInput, CardMonthlyUpdate, CalculatedDebt } from "@/types/card-monthly.ts";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type { User } from "@/types/user";
export type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from "@/types/transaction";
export type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types/category";
export type { PantryItem, PantryItemInput, PantryItemUpdate, PantryFilter } from "@/types/pantry";
export type { Note, CreateNoteInput, UpdateNoteInput, NoteFilter } from "@/types/note";
export type { NoteTag } from "@/types/note";
export type { Event, CreateEventInput, UpdateEventInput, EventFilter } from "@/types/event";
export type { CreditCard, CreditCardInput } from "@/types/credit-card";
export type { Installment, InstallmentInput, InstallmentFilter } from "@/types/installment";
export type { RecurringPayment, RecurringPaymentInput, RecurringPaymentMonthly, RecurringPaymentMonthlyUpdate } from "@/types/recurring-payment";
export type { Cashback, CashbackInput } from "@/types/cashback";
export type { ShoppingItem, ShoppingItemInput, ShoppingItemUpdate, ShoppingFilter } from "@/types/shopping";
export type { PaymentMethod, CreatePaymentMethodInput, UpdatePaymentMethodInput } from "@/types/payment-method";
export type { CardMonthly, CardMonthlyInput, CardMonthlyUpdate, CalculatedDebt } from "@/types/card-monthly";

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

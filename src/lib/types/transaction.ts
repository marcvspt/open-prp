export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  family_id: string | null;
  card_id: string | null;
  installment_id: string | null;
  payment_method_id: string | null;
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  category_id?: string;
  family_id?: string;
  card_id?: string;
  installment_id?: string;
  payment_method_id?: string;
  type: "income" | "expense";
  amount: number;
  currency?: string;
  description?: string;
  date: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface UpdateTransactionInput {
  category_id?: string;
  family_id?: string;
  card_id?: string;
  installment_id?: string;
  payment_method_id?: string;
  type?: "income" | "expense";
  amount?: number;
  currency?: string;
  description?: string;
  date?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface TransactionFilter {
  type?: "income" | "expense";
  category_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
  scope?: "personal" | "family" | "all";
  family_id?: string;
}

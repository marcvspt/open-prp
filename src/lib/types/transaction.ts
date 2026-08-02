export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  payment_method_id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  category_id?: string;
  payment_method_id: string;
  type: "income" | "expense";
  amount: number;
  currency?: string;
  description?: string;
  date: string;
}

export interface UpdateTransactionInput {
  category_id?: string;
  payment_method_id?: string;
  type?: "income" | "expense";
  amount?: number;
  currency?: string;
  description?: string;
  date?: string;
}

export interface TransactionFilter {
  type?: "income" | "expense";
  category_id?: string;
  payment_method_id?: string;
  q?: string;
  month?: string;
  date_from?: string;
  date_to?: string;
}

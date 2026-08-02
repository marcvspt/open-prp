export interface RecurringPayment {
  id: string;
  user_id: string;
  name: string;
  default_amount: number;
  currency: string;
  type: "income" | "expense";
  category_id: string | null;
  payment_method_id: string;
  created_at: string;
  updated_at: string;
  /** Joined from payment_methods via findAll() */
  payment_method_name?: string;
  payment_method_icon?: string | null;
  /** Joined from categories via findAll() */
  category_name?: string | null;
}

export interface RecurringPaymentInput {
  name: string;
  default_amount: number;
  currency?: string;
  type?: "income" | "expense";
  category_id?: string;
  payment_method_id: string;
}

export interface RecurringPaymentMonthly {
  id: string;
  payment_id: string;
  user_id: string;
  month: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  payment_method_id: string;
  is_active: boolean;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  name?: string;
  default_amount?: number;
  currency?: string;
}

export interface RecurringPaymentMonthlyUpdate {
  amount?: number;
  category_id?: string;
  payment_method_id?: string;
  is_active?: boolean;
  is_paid?: boolean;
}

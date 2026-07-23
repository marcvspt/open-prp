export interface Installment {
  id: string;
  user_id: string;
  card_id: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  description: string;
  total_amount: number;
  monthly_amount: number;
  total_months: number;
  remaining_months: number;
  start_date: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface InstallmentInput {
  card_id?: string;
  category_id?: string;
  payment_method_id?: string;
  description: string;
  total_amount: number;
  monthly_amount: number;
  total_months: number;
  remaining_months?: number;
  start_date: string;
  currency?: string;
}

export interface InstallmentFilter {
  card_id?: string;
  active_only?: boolean;
}

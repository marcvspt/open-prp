export interface Installment {
  id: string;
  user_id: string;
  card_id: string | null;
  family_id: string | null;
  description: string;
  total_amount: number;
  monthly_amount: number;
  total_months: number;
  remaining_months: number;
  start_month: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallmentInput {
  card_id?: string;
  family_id?: string;
  description: string;
  total_amount: number;
  monthly_amount: number;
  total_months: number;
  remaining_months?: number;
  start_month: string;
  category?: string;
}

export interface InstallmentFilter {
  card_id?: string;
  active_only?: boolean;
  family_id?: string;
  scope?: "personal" | "family" | "all";
}

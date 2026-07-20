export interface RecurringService {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  default_amount: number;
  card_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringServiceInput {
  name: string;
  default_amount: number;
  card_id?: string;
  family_id?: string;
}

export interface ServiceMonthly {
  id: string;
  service_id: string;
  month: string;
  amount: number;
  is_active: boolean;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface ServiceMonthlyUpdate {
  amount?: number;
  is_active?: boolean;
  is_paid?: boolean;
}

export interface ServiceMonthlyInput {
  service_id: string;
  month: string;
  amount: number;
}

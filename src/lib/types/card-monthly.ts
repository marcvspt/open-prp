export interface CardMonthly {
  id: string;
  card_id: string;
  user_id: string;
  month: string;
  statement_balance: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardMonthlyInput {
  card_id: string;
  month: string;
  statement_balance: number;
}

export interface CardMonthlyUpdate {
  statement_balance?: number;
  is_paid?: boolean;
}

export interface CalculatedDebt {
  total_purchases: number;
  total_installments: number;
  total_cashback: number;
  statement_balance: number;
  committed_installments: number;
  total_committed: number;
}

export interface CardMonthly {
  id: string;
  card_id: string;
  user_id: string;
  month: string;
  currency: string | null;
  statement_balance: number;
  paid_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardMonthlyInput {
  card_id: string;
  month: string;
  statement_balance: number;
  currency: string | null;
}

export interface StatementAmounts {
  total_purchases: number;
  total_installments: number;
  total_recurring: number;
  total_cashback: number;
}

export interface CalculatedDebt extends StatementAmounts {
  statement_balance: number;
  currency: string | null;
  mixed_currency: boolean;
  committed_installments: number | null;
  total_committed: number | null;
}

export interface CardPaymentInput {
  id: string;
  statement_balance: number;
  currency: string;
  paid_amount?: number;
  paid_at?: string;
}

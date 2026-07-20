export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  type: "credit" | "debit";
  max_limit: number;
  closing_day: number;
  due_day: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInput {
  name: string;
  type: "credit" | "debit";
  max_limit: number;
  closing_day: number;
  due_day: number;
  color?: string;
}

export interface CreditCardMonthly {
  card_id: string;
  month: string;
  statement_balance: number;
  total_installments: number;
  total_purchases: number;
  total_cashback: number;
  available_credit: number;
}

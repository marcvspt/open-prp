export interface Cashback {
  id: string;
  user_id: string;
  card_id: string | null;
  amount: number;
  description: string | null;
  date: string;
  applied_month: string | null;
  created_at: string;
}

export interface CashbackInput {
  card_id?: string;
  amount: number;
  description?: string;
  date: string;
  applied_month?: string;
}

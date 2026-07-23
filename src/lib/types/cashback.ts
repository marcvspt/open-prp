export interface Cashback {
  id: string;
  user_id: string;
  card_id: string | null;
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  created_at: string;
}

export interface CashbackInput {
  card_id?: string;
  amount: number;
  currency?: string;
  description?: string;
  date: string;
}

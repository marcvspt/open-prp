export type CardType = "credit" | "debit" | "voucher";

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  type: CardType;
  max_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInput {
  name: string;
  type: CardType;
  max_limit?: number | null;
  closing_day?: number | null;
  due_day?: number | null;
  color?: string;
}



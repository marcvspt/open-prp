export type PaymentMethodType = "global" | "personal" | "card";

export interface PaymentMethod {
  id: string;
  user_id: string | null;
  name: string;
  type: PaymentMethodType;
  card_id: string | null;
  icon: string | null;
  color: string | null;
  seq: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodInput {
  name: string;
  type?: PaymentMethodType;
  icon?: string;
  color?: string;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  type?: PaymentMethodType;
  icon?: string;
  color?: string;
}

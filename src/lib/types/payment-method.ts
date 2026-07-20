export interface PaymentMethod {
  id: string;
  user_id: string | null;
  name: string;
  is_global: number;
  scope: "personal" | "family" | "both" | null;
  family_id: string | null;
  card_id: string | null;
  icon: string | null;
  color: string | null;
  seq: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodInput {
  name: string;
  scope?: "personal" | "family" | "both";
  family_id?: string;
  icon?: string;
  color?: string;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  scope?: "personal" | "family" | "both";
  family_id?: string;
  icon?: string;
  color?: string;
}

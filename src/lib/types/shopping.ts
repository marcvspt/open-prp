export interface ShoppingItem {
  id: string;
  seq: number;
  user_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  is_checked: boolean;
  is_completed: boolean;
  completed_at: string | null;
  category: string | null;
  despensa_item_id: string | null;
  event_id: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  despensa_item_id?: string;
  event_id?: string;
  priority?: number;
}

export interface ShoppingItemUpdate {
  name?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  is_checked?: boolean;
  is_completed?: boolean;
  category?: string;
  event_id?: string;
  priority?: number;
}

export interface ShoppingFilter {
  is_checked?: boolean;
  is_completed?: boolean;
  category?: string;
  event_id?: string;
}

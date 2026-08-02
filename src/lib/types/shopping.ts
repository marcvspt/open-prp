export interface ShoppingList {
  id: string;
  seq: number;
  user_id: string;
  name: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListInput {
  name?: string;
}

export interface ShoppingListUpdate {
  name?: string;
}

export interface ShoppingItem {
  id: string;
  seq: number;
  user_id: string;
  list_id: string | null;
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
  list_id?: string;
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
  list_id?: string;
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
  list_id?: string;
  category?: string;
  event_id?: string;
}

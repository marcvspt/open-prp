export interface PantryItem {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItemInput {
  description: string;
  quantity?: number;
  notes?: string;
  category_id?: string;
}

export interface PantryItemUpdate {
  description?: string;
  quantity?: number;
  notes?: string;
  category_id?: string;
}

export interface PantryFilter {
  category_id?: string;
  page?: number;
  pageSize?: number;
}

export interface PantryCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface PantryCategoryInput {
  name: string;
  icon?: string;
  color?: string;
}

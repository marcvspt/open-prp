export interface PantryItem {
  id: string;
  user_id: string;
  family_id: string | null;
  category_id: string | null;
  name: string;
  default_quantity: number;
  unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItemInput {
  name: string;
  default_quantity?: number;
  unit?: string;
  notes?: string;
  category_id?: string;
  family_id?: string;
}

export interface PantryItemUpdate {
  name?: string;
  default_quantity?: number;
  unit?: string;
  notes?: string;
  category_id?: string;
  family_id?: string;
}

export interface PantryFilter {
  category_id?: string;
  page?: number;
  pageSize?: number;
  scope?: "personal" | "family" | "all";
  family_id?: string;
}

export interface PantryCategory {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface PantryCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  family_id?: string;
}

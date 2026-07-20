export interface Category {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  family_id?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
  family_id?: string;
}

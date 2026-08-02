type CategoryType = "global" | "personal";

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  sections: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  sections: string;
  type?: CategoryType;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  sections?: string;
  type?: CategoryType;
  icon?: string;
  color?: string;
}

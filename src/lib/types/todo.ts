export interface Todo {
  id: string;
  seq: number;
  user_id: string;
  family_id: string | null;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  priority: number;
  category: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoInput {
  title: string;
  description?: string;
  due_date?: string;
  priority?: number;
  category?: string;
  event_id?: string;
  family_id?: string;
}

export interface TodoUpdate {
  title?: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  priority?: number;
  category?: string;
  event_id?: string;
  family_id?: string;
}

export interface TodoFilter {
  is_completed?: boolean;
  category?: string;
  event_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  family_id?: string;
  scope?: "personal" | "family" | "all";
}

export interface Task {
  id: string;
  seq: number;
  user_id: string;
  description: string;
  is_completed: boolean;
  due_date: string | null;
  priority: number;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  description: string;
  due_date?: string;
  priority?: number;
  category?: string;
}

export interface TaskUpdate {
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  priority?: number;
  category?: string;
}

export interface TaskFilter {
  is_completed?: boolean;
  category?: string;
  due_date_from?: string;
  due_date_to?: string;
}

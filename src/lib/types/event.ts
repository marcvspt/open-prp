export interface Event {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_all_day: boolean;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  color: string | null;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  description: string;
  location?: string;
  category_id?: string;
  start_date: string;
  end_date?: string;
  is_all_day?: boolean;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  color?: string;
  recurrence_rule?: string;
}

export interface UpdateEventInput {
  description?: string;
  location?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  is_all_day?: boolean;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  color?: string;
  recurrence_rule?: string;
}

export interface EventFilter {
  status?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
}

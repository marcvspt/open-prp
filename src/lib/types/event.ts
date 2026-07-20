export interface Event {
  id: string;
  user_id: string;
  family_id: string | null;
  title: string;
  description: string | null;
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
  title: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_all_day?: boolean;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  color?: string;
  recurrence_rule?: string;
  family_id?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_all_day?: boolean;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  color?: string;
  recurrence_rule?: string;
  family_id?: string;
}

export interface EventFilter {
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
  scope?: "personal" | "family" | "all";
  family_id?: string;
}

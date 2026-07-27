export interface User {
  id: string;
  clerk_id: string;
  email: string | null;
  display_name: string | null;
  preferred_currency: string;
  created_at: string;
  updated_at: string;
}

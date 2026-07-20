export interface Note {
  id: string;
  user_id: string;
  family_id: string | null;
  title: string;
  content: string | null;
  is_pinned: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  is_pinned?: boolean;
  color?: string;
  tag_ids?: string[];
  family_id?: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  is_pinned?: boolean;
  color?: string;
  tag_ids?: string[];
  family_id?: string;
}

export interface NoteFilter {
  is_pinned?: boolean;
  tag_id?: string;
  page?: number;
  pageSize?: number;
  scope?: "personal" | "family" | "all";
  family_id?: string;
}

export interface NoteTag {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  color: string | null;
  created_at: string;
}

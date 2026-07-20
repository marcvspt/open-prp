export type FamilyRole = "admin" | "member" | "viewer";

export interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  created_at: string;
}

export interface CreateFamilyInput {
  name: string;
}

export interface UpdateFamilyInput {
  name?: string;
}

export interface AddMemberInput {
  user_id: string;
  role?: FamilyRole;
}

export interface FamilyFilter {
  scope?: "personal" | "family" | "all";
  family_id?: string;
}

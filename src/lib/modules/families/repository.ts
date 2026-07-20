import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import type { Family, FamilyMember, FamilyRole, CreateFamilyInput, UpdateFamilyInput, AddMemberInput } from "../../types/family";

export class FamilyRepository {
  async findAllByUser(userId: string): Promise<(Family & { role: FamilyRole })[]> {
    const result = await getDb().execute({
      sql: `SELECT f.*, fm.role FROM families f
            INNER JOIN family_members fm ON fm.family_id = f.id
            WHERE fm.user_id = ?`,
      args: [userId],
    });
    return result.rows as unknown as (Family & { role: FamilyRole })[];
  }

  async findById(id: string): Promise<Family | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM families WHERE id = ?",
      args: [id],
    });
    return (result.rows[0] as unknown as Family | undefined) ?? null;
  }

  async create(data: CreateFamilyInput, userId: string): Promise<Family> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("families");
    const now = new Date().toISOString();

    await db.execute({
      sql: "INSERT INTO families (id, name, seq, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, data.name, seq, now, now],
    });

    const memberId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO family_members (id, family_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [memberId, id, userId, "admin", now],
    });

    const result = await db.execute({ sql: "SELECT * FROM families WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Family;
  }

  async update(id: string, data: UpdateFamilyInput): Promise<Family | null> {
    const db = getDb();
    const existing = await this.findById(id);
    if (!existing) return null;

    await db.execute({
      sql: "UPDATE families SET name = ?, updated_at = ? WHERE id = ?",
      args: [data.name, new Date().toISOString(), id],
    });

    const result = await db.execute({ sql: "SELECT * FROM families WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as Family;
  }

  async delete(id: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM families WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async getMembers(familyId: string): Promise<FamilyMember[]> {
    const result = await getDb().execute({
      sql: "SELECT * FROM family_members WHERE family_id = ?",
      args: [familyId],
    });
    return result.rows as unknown as FamilyMember[];
  }

  async addMember(familyId: string, data: AddMemberInput): Promise<FamilyMember> {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: "INSERT INTO family_members (id, family_id, user_id, role, seq, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, familyId, data.user_id, data.role ?? "member", await nextSeq("family_members"), now],
    });

    const result = await db.execute({ sql: "SELECT * FROM family_members WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as FamilyMember;
  }

  async removeMember(familyId: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM family_members WHERE family_id = ? AND user_id = ?",
      args: [familyId, userId],
    });
    return result.rowsAffected > 0;
  }

  async updateMemberRole(familyId: string, userId: string, role: FamilyRole): Promise<boolean> {
    const result = await getDb().execute({
      sql: "UPDATE family_members SET role = ? WHERE family_id = ? AND user_id = ?",
      args: [role, familyId, userId],
    });
    return result.rowsAffected > 0;
  }
}

import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import { localISOString } from "../../date";
import type { RecurringService, RecurringServiceInput, ServiceMonthly, ServiceMonthlyUpdate } from "../../types/service";

export class ServiceRepository {
  async findAll(userId: string, familyId?: string): Promise<RecurringService[]> {
    const db = getDb();
    const conditions = ["user_id = ?"];
    const args: any[] = [userId];

    if (familyId) {
      conditions.push("(family_id IS NULL OR family_id = ?)");
      args.push(familyId);
    } else {
      conditions.push("family_id IS NULL");
    }

    const result = await db.execute({
      sql: `SELECT * FROM recurring_services WHERE ${conditions.join(" AND ")} ORDER BY name ASC`,
      args,
    });
    return result.rows as unknown as RecurringService[];
  }

  async findById(id: string, userId: string): Promise<RecurringService | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM recurring_services WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return (result.rows[0] as unknown as RecurringService | undefined) ?? null;
  }

  async create(data: RecurringServiceInput, userId: string): Promise<RecurringService> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("recurring_services");
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO recurring_services (id, user_id, family_id, name, default_amount, card_id, seq, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.family_id ?? null, data.name, data.default_amount, data.card_id ?? null, seq, now, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM recurring_services WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as RecurringService;
  }

  async update(id: string, data: Partial<RecurringServiceInput>, userId: string): Promise<RecurringService | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
    if (data.default_amount !== undefined) { sets.push("default_amount = ?"); args.push(data.default_amount); }
    if (data.card_id !== undefined) { sets.push("card_id = ?"); args.push(data.card_id ?? null); }
    if (data.family_id !== undefined) { sets.push("family_id = ?"); args.push(data.family_id ?? null); }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE recurring_services SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM recurring_services WHERE id = ?", args: [id] });
    return result.rows[0] as unknown as RecurringService;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM recurring_services WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }

  async getMonthly(serviceId: string, month: string): Promise<ServiceMonthly | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM service_monthly WHERE service_id = ? AND month = ?",
      args: [serviceId, month],
    });
    const row = result.rows[0] as unknown as ServiceMonthly | undefined;
    if (!row) return null;
    return { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active), is_paid: Boolean(row.is_paid) };
  }

  async upsertMonthly(serviceId: string, month: string, data: ServiceMonthlyUpdate): Promise<ServiceMonthly> {
    const db = getDb();
    const existing = await this.getMonthly(serviceId, month);

    if (existing) {
      const sets: string[] = [];
      const args: any[] = [];
      if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }
      if (data.is_active !== undefined) { sets.push("is_active = ?"); args.push(data.is_active ? 1 : 0); }
      if (data.is_paid !== undefined) { sets.push("is_paid = ?"); args.push(data.is_paid ? 1 : 0); }
      if (sets.length > 0) {
        args.push(serviceId, month);
        await db.execute({
          sql: `UPDATE service_monthly SET ${sets.join(", ")} WHERE service_id = ? AND month = ?`,
          args,
        });
      }
      return (await this.getMonthly(serviceId, month))!;
    }

    const id = crypto.randomUUID();
    const svc = await db.execute({
      sql: "SELECT default_amount FROM recurring_services WHERE id = ?",
      args: [serviceId],
    });
    const defaultAmount = Number(svc.rows[0]?.default_amount ?? data.amount ?? 0);
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO service_monthly (id, service_id, month, amount, is_active, is_paid, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, serviceId, month, data.amount ?? defaultAmount, data.is_active !== false ? 1 : 0, data.is_paid ? 1 : 0, now],
    });

    return (await this.getMonthly(serviceId, month))!;
  }

  async getMonthServices(month: string, userId: string): Promise<ServiceMonthly[]> {
    const result = await getDb().execute({
      sql: `SELECT sm.* FROM service_monthly sm
            INNER JOIN recurring_services rs ON rs.id = sm.service_id
            WHERE sm.month = ? AND rs.user_id = ? AND sm.is_active = 1
            ORDER BY rs.name ASC`,
      args: [month, userId],
    });
    return (result.rows as unknown as ServiceMonthly[]).map(r => ({
      ...r, amount: Number(r.amount), is_active: Boolean(r.is_active), is_paid: Boolean(r.is_paid),
    }));
  }
}

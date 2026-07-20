import { getDb } from "../../db/client";
import { nextSeq } from "../../db/utils";
import { localISOString } from "../../date";
import type { ServiceMonthly, ServiceMonthlyInput } from "../../types/service";

export class ServiceMonthlyRepository {
  async findAll(userId: string, serviceId?: string): Promise<ServiceMonthly[]> {
    const db = getDb();
    const conditions = ["user_id = ?"];
    const args: any[] = [userId];

    if (serviceId) { conditions.push("service_id = ?"); args.push(serviceId); }

    const result = await db.execute({
      sql: `SELECT * FROM service_monthly WHERE ${conditions.join(" AND ")} ORDER BY month DESC`,
      args,
    });
    return (result.rows as unknown as ServiceMonthly[]).map(r => ({
      ...r, amount: Number(r.amount), is_active: Boolean(r.is_active), is_paid: Boolean(r.is_paid),
    }));
  }

  async findByMonth(month: string, userId: string): Promise<ServiceMonthly[]> {
    const db = getDb();
    const result = await db.execute({
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

  async findById(id: string, userId: string): Promise<ServiceMonthly | null> {
    const result = await getDb().execute({
      sql: "SELECT * FROM service_monthly WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    const row = result.rows[0] as unknown as ServiceMonthly | undefined;
    if (!row) return null;
    return { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active), is_paid: Boolean(row.is_paid) };
  }

  async create(data: ServiceMonthlyInput, userId: string): Promise<ServiceMonthly> {
    const db = getDb();
    const id = crypto.randomUUID();
    const seq = await nextSeq("service_monthly");
    const now = localISOString();

    await db.execute({
      sql: `INSERT INTO service_monthly (id, user_id, service_id, month, amount, is_active, is_paid, seq, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.service_id, data.month, data.amount, 1, 0, seq, now],
    });

    const result = await db.execute({ sql: "SELECT * FROM service_monthly WHERE id = ?", args: [id] });
    const row = result.rows[0] as unknown as ServiceMonthly;
    return { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active), is_paid: Boolean(row.is_paid) };
  }

  async update(id: string, data: Partial<ServiceMonthlyInput>, userId: string): Promise<ServiceMonthly | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: any[] = [];

    if (data.month !== undefined) { sets.push("month = ?"); args.push(data.month); }
    if (data.amount !== undefined) { sets.push("amount = ?"); args.push(data.amount); }

    if (sets.length === 0) return existing;

    args.push(id, userId);
    await db.execute({
      sql: `UPDATE service_monthly SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: "DELETE FROM service_monthly WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return result.rowsAffected > 0;
  }

  async togglePaid(id: string, userId: string, isPaid: boolean): Promise<ServiceMonthly | null> {
    const db = getDb();
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const now = localISOString();
    await db.execute({
      sql: `UPDATE service_monthly SET is_paid = ?, paid_at = ? WHERE id = ? AND user_id = ?`,
      args: [isPaid ? 1 : 0, isPaid ? now : null, id, userId],
    });

    return this.findById(id, userId);
  }

  async getHistory(userId: string, limit = 12): Promise<ServiceMonthly[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT sm.* FROM service_monthly sm
            INNER JOIN recurring_services rs ON rs.id = sm.service_id
            WHERE sm.user_id = ? AND sm.is_active = 1
            ORDER BY sm.month DESC, rs.name ASC
            LIMIT ?`,
      args: [userId, limit * 20],
    });
    return (result.rows as unknown as ServiceMonthly[]).map(r => ({
      ...r, amount: Number(r.amount), is_active: Boolean(r.is_active), is_paid: Boolean(r.is_paid),
    }));
  }

  async getOrCreateForMonth(serviceId: string, month: string, userId: string): Promise<ServiceMonthly> {
    const existing = await getDb().execute({
      sql: "SELECT * FROM service_monthly WHERE service_id = ? AND month = ? AND user_id = ?",
      args: [serviceId, month, userId],
    });
    if (existing.rows.length > 0) {
      const row = existing.rows[0] as unknown as ServiceMonthly;
      return { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active), is_paid: Boolean(row.is_paid) };
    }

    const svc = await getDb().execute({
      sql: "SELECT default_amount FROM recurring_services WHERE id = ?",
      args: [serviceId],
    });
    const amount = Number(svc.rows[0]?.default_amount ?? 0);
    return this.create({ service_id: serviceId, month, amount }, userId);
  }
}

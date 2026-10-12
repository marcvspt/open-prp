import { getDb } from "@/lib/db/client.ts";
import { scopedDelete, insertRow, applyUpdate, type SqlValue } from "@/lib/db/utils.ts";
import { addMonths, currentMonthStr, installmentFirstMonth, installmentRemaining, lastDayOfMonth } from "@/lib/date.ts";
import type { Installment, InstallmentInput, InstallmentFilter, InstallmentListFilter, InstallmentScheduleRow } from "@/lib/types/installment.ts";
import type { PaginatedResponse } from "@/lib/types/general.ts";

const scheduleQuery = `SELECT i.*, CASE WHEN c.type = 'credit' THEN c.cutoff_day ELSE NULL END AS cutoff_day
  FROM installments i
  LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id AND (pm.user_id = i.user_id OR pm.type = 'global')
  LEFT JOIN cards c ON c.id = pm.card_id AND c.user_id = i.user_id`;

function withRemaining(row: InstallmentScheduleRow, month: string): Installment {
  const { cutoff_day, ...installment } = row;
  return {
    ...installment,
    remaining_months: installmentRemaining(month, installmentFirstMonth(row.start_date, cutoff_day), row.total_months),
  };
}

export class InstallmentRepository {
  async findPaginated(userId: string, filter: InstallmentListFilter = {}): Promise<PaginatedResponse<Installment>> {
    const rows = await this.findAll(userId, filter);
    const page = Number.isFinite(filter.page) ? Math.max(1, Math.trunc(filter.page ?? 1)) : 1;
    const pageSize = Number.isFinite(filter.pageSize) ? Math.min(100, Math.max(1, Math.trunc(filter.pageSize ?? 50))) : 50;
    const offset = (page - 1) * pageSize;
    return { data: rows.slice(offset, offset + pageSize), total: rows.length, page, pageSize };
  }

  async findSummaryByMonth(userId: string, month: string): Promise<Installment[]> {
    return this.findAll(userId, { month, active_only: true });
  }

  async findAll(userId: string, filter?: InstallmentFilter): Promise<Installment[]> {
    const db = getDb();
    const conditions: string[] = ["i.user_id = ?"];
    const args: (string | number | boolean | null)[] = [userId];

    if (filter?.category_id) { conditions.push("i.category_id = ?"); args.push(filter.category_id); }
    if (filter?.payment_method_id) { conditions.push("i.payment_method_id = ?"); args.push(filter.payment_method_id); }
    if (filter?.q) { conditions.push("i.description LIKE ?"); args.push(`%${filter.q}%`); }

    const result = await db.execute({
      sql: `${scheduleQuery} WHERE ${conditions.join(" AND ")} ORDER BY i.start_date DESC, i.created_at DESC, i.id DESC`,
      args,
    });
    const rows = result.rows as unknown as InstallmentScheduleRow[];
    const targetMonth = filter?.month || currentMonthStr();
    return rows.filter(i => {
      if (i.total_months <= 0) return false;
      const firstMonth = installmentFirstMonth(i.start_date, i.cutoff_day);
      const lastMonth = addMonths(`${firstMonth}-01`, i.total_months - 1).slice(0, 7);
      if (filter?.month && firstMonth > targetMonth) return false;
      if (filter?.active_only && lastMonth < targetMonth) return false;
      if (filter?.inactive_only && lastMonth >= targetMonth) return false;
      if (filter?.date_from || filter?.date_to) {
        return (!filter.date_from || lastDayOfMonth(lastMonth) >= filter.date_from) && (!filter.date_to || `${firstMonth}-01` <= filter.date_to);
      }
      return true;
    }).map(row => withRemaining(row, targetMonth));
  }

  async findById(id: string, userId: string): Promise<Installment | null> {
    const result = await getDb().execute({
      sql: `${scheduleQuery} WHERE i.id = ? AND i.user_id = ?`,
      args: [id, userId],
    });
    const row = result.rows[0] as unknown as InstallmentScheduleRow | undefined;
    return row ? withRemaining(row, currentMonthStr()) : null;
  }

  async create(data: InstallmentInput, userId: string): Promise<Installment> {
    return insertRow<Installment>("installments", userId, [
      "category_id", "payment_method_id", "description", "total_amount", "monthly_amount",
      "total_months", "remaining_months", "start_date", "currency",
    ], [
      data.category_id || null,
      data.payment_method_id,
      data.description, data.total_amount,
      data.monthly_amount, data.total_months,
      data.remaining_months ?? data.total_months,
      data.start_date, data.currency ?? "MXN",
    ]);
  }

  async update(id: string, data: Partial<InstallmentInput>, userId: string): Promise<Installment | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const sets: string[] = [];
    const args: SqlValue[] = [];

    if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description); }
    if (data.total_amount !== undefined) { sets.push("total_amount = ?"); args.push(data.total_amount); }
    if (data.monthly_amount !== undefined) { sets.push("monthly_amount = ?"); args.push(data.monthly_amount); }
    if (data.total_months !== undefined) { sets.push("total_months = ?"); args.push(data.total_months); }
    if (data.remaining_months !== undefined) { sets.push("remaining_months = ?"); args.push(data.remaining_months); }
    if (data.start_date !== undefined) { sets.push("start_date = ?"); args.push(data.start_date); }
    if (data.currency !== undefined) { sets.push("currency = ?"); args.push(data.currency); }
    if (data.category_id !== undefined) { sets.push("category_id = ?"); args.push(data.category_id || null); }
    if (data.payment_method_id !== undefined) { sets.push("payment_method_id = ?"); args.push(data.payment_method_id); }

    return applyUpdate<Installment>("installments", id, userId, sets, args, { existing });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return scopedDelete("installments", id, userId);
  }
}

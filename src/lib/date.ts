export function localISOString(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 19);
}

/** Days from today to `date` (YYYY-MM-DD); negative when the date is in the past. */
export function daysUntilDate(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * Resolves the payment due date (YYYY-MM-DD) for a statement closing on `cutoffDay`
 * of `month` (YYYY-MM): if the due day is after the cutoff day it falls in the same
 * month, otherwise it falls in the following month.
 */
export function resolvePaymentDueDate(month: string, cutoffDay: number, paymentDueDay: number): string {
  const [y, m] = month.split("-").map(Number);
  let dueY = y;
  let dueM = m;
  if (paymentDueDay <= cutoffDay) {
    dueM = m === 12 ? 1 : m + 1;
    dueY = m === 12 ? y + 1 : y;
  }
  const day = Math.min(paymentDueDay, new Date(dueY, dueM, 0).getDate());
  return `${dueY}-${String(dueM).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Same as `resolvePaymentDueDate` but tolerates a null cutoff (falls back to the last day of the month). */
export function paymentDueDate(month: string, cutoffDay: number | null, paymentDueDay: number): string {
  const [y, m] = month.split("-").map(Number);
  const cutoff = cutoffDay ?? new Date(y, m, 0).getDate();
  return resolvePaymentDueDate(month, cutoff, paymentDueDay);
}

/** Days until the payment due date of a statement month; negative when overdue. */
export function daysUntilPaymentDue(month: string, cutoffDay: number | null, paymentDueDay: number): number {
  return daysUntilDate(paymentDueDate(month, cutoffDay, paymentDueDay));
}

/** True when the payment was made after the statement month's payment due date. */
export function isPaymentLate(month: string, cutoffDay: number | null, paymentDueDay: number | null, paidAt: string | null): boolean {
  if (paymentDueDay == null || paidAt == null) return false;
  return paidAt.slice(0, 10) > paymentDueDate(month, cutoffDay, paymentDueDay);
}

export function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthOptions(count = 12, created_at?: string): string[] {
  const now = new Date();
  const maxPast = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);

  let start: Date;
  if (created_at) {
    const created = new Date(created_at);
    const createdMonth = new Date(created.getFullYear(), created.getMonth(), 1);
    start = createdMonth > maxPast ? createdMonth : maxPast;
  } else {
    start = maxPast;
  }

  const months: string[] = [];
  // Newest first: next, current, then past
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  months.push(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
  let d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  while (d >= start) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return months;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es", { year: "numeric", month: "long" });
}

export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${month}-${String(d).padStart(2, "0")}`;
}

export function isInstallmentInMonth(month: string, startDate: string, totalMonths: number): boolean {
  function addMonths(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const totalM = m - 1 + n;
    const newY = y + Math.floor(totalM / 12);
    const newM = totalM % 12 + 1;
    const lastDay = new Date(newY, newM, 0).getDate();
    const newD = Math.min(d, lastDay);
    return `${newY}-${String(newM).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
  }
  const [my, mm] = month.split("-").map(Number);
  for (let n = 0; n < totalMonths; n++) {
    const pd = addMonths(startDate, n);
    const [py, pm] = pd.split("-").map(Number);
    if (py === my && pm === mm) return true;
  }
  return false;
}

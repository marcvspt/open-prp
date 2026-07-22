export function localISOString(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 19);
}

export function daysUntil(targetDay: number): number {
  const now = new Date();
  const today = now.getDate();
  let diff = targetDay - today;
  if (diff < 0) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
    const todayDate = new Date(now.getFullYear(), now.getMonth(), today);
    diff = Math.ceil((nextMonth.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  return diff;
}

export function getMonthOptions(count = 12): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
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

export function isMonthInRange(month: string, startMonth: string, totalMonths: number): boolean {
  if (month < startMonth) return false;
  const [sy, sm] = startMonth.split("-").map(Number);
  let em = sm + totalMonths;
  let ey = sy;
  while (em > 12) { em -= 12; ey += 1; }
  const endMonth = `${ey}-${String(em).padStart(2, "0")}`;
  return month < endMonth;
}

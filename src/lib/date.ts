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

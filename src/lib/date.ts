export function localISOString(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 19);
}

export function localDateString(): string {
  return new Date().toLocaleDateString("sv");
}

export function localMonth(): string {
  return localDateString().slice(0, 7);
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

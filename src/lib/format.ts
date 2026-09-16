export function formatCurrency(n: number, opts?: { showPlus?: boolean }): string {
  const sign = n < 0 ? "-" : opts?.showPlus ? "+" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

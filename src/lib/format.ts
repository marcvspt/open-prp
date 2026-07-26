export function formatCurrency(n: number): string {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
}

export type Currency = "EUR" | "MXN" | "USD";

const STORAGE_KEY = "currency";
const VALID: readonly Currency[] = ["EUR", "MXN", "USD"];

export function saveCurrency(currency: Currency): void {
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // localStorage unavailable
  }
}

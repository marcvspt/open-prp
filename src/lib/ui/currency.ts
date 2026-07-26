export type Currency = "EUR" | "MXN" | "USD";

const STORAGE_KEY = "currency";
const VALID: readonly Currency[] = ["EUR", "MXN", "USD"];

export function getCurrency(): Currency {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (VALID.includes(stored as Currency)) return stored as Currency;
  } catch {
    // localStorage unavailable
  }
  return "MXN";
}

export function saveCurrency(currency: Currency): void {
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // localStorage unavailable
  }
}

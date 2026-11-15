import type { LocaleCode } from "@/lib/i18n/locale.ts";

export function formatCurrency(n: number, opts?: { showPlus?: boolean }): string {
  const sign = n < 0 ? "-" : opts?.showPlus ? "+" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function chartAmountFormatters(locale: LocaleCode, currency: string) {
  const numberLocale = locale === "es" ? "es-MX" : "en-US";
  const amount = new Intl.NumberFormat(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const axisAmount = new Intl.NumberFormat(numberLocale, { notation: "compact", maximumFractionDigits: 1 });
  return {
    formatAmount: (value: number) => `${amount.format(value)} ${currency}`,
    axisAmount,
  };
}

export function formatAmount(value: number, locale: LocaleCode, currency: string | null, showPlus = false): string {
  const sign = showPlus && value > 0 ? "+" : "";
  return sign + chartAmountFormatters(locale, currency ?? "").formatAmount(value === 0 ? 0 : value).trimEnd();
}

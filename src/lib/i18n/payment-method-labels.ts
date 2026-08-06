import type { Locale } from "@/lib/i18n/es.ts";

export function displayPaymentMethodName(pm: { name: string; type: string }, t: Locale): string {
  if (pm.type === "global") {
    return (t.paymentMethodLabels as Record<string, string>)[pm.name] ?? pm.name;
  }
  return pm.name;
}

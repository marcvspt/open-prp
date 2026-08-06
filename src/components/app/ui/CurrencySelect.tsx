import { useState } from "react";
import Select from "@/components/ui/Select.tsx";
import { saveCurrency, type Currency } from "@/lib/ui/currency.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

const VALID: readonly string[] = ["EUR", "MXN", "USD"];

interface Props {
  initialCurrency?: string;
  locale?: LocaleCode;
}

export default function CurrencySelect({ initialCurrency, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const [currency, setCurrency] = useState<Currency>(
    initialCurrency && VALID.includes(initialCurrency) ? (initialCurrency as Currency) : "MXN"
  );

  function handleChange(value: string) {
    const next = value as Currency;
    fetch("/api/users/currency", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: next }),
    }).catch(() => {});
    saveCurrency(next);
    setCurrency(next);
  }

  return (
    <LocaleProvider locale={locale}>
      <Select
        value={currency}
        onChange={handleChange}
        options={t.currency.options}
        className="w-full"
        ariaLabel={t.select.ariaCurrency}
      />
    </LocaleProvider>
  );
}

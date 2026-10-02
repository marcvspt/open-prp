import { apiFetch, apiErrorMessage } from "@/lib/api-client.ts";
import { useState, useRef } from "react";
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

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  async function handleChange(value: string) {
    if (savingRef.current || !VALID.includes(value)) return;
    savingRef.current = true;
    const next = value as Currency;
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/users/currency", { method: "PUT", body: JSON.stringify({ currency: next }) });
      setCurrency(next);
      saveCurrency(next);
    } catch (err: unknown) { setError(apiErrorMessage(err, t)); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <LocaleProvider locale={locale}>
      <Select
        disabled={saving}
        value={currency}
        onChange={handleChange}
        options={t.currency.options}
        className="w-full"
        ariaLabel={t.select.ariaCurrency}
      />
      {error && <p role="alert" className="text-xs text-danger-text">{error}</p>}
    </LocaleProvider>
  );
}

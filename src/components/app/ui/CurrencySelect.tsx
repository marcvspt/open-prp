import { useState } from "react";
import Select from "@/components/ui/Select.tsx";
import { saveCurrency, type Currency } from "@/lib/ui/currency.ts";
import { labels } from "@/lib/labels.ts";

const options = labels.currency.options;

const VALID: readonly string[] = ["EUR", "MXN", "USD"];

interface Props {
  initialCurrency?: string;
}

export default function CurrencySelect({ initialCurrency }: Props) {
  const [currency, setCurrency] = useState<Currency>(
    initialCurrency && VALID.includes(initialCurrency) ? (initialCurrency as Currency) : "MXN"
  );

  function handleChange(value: string) {
    const next = value as Currency;
    fetch("/api/users/currency", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: next }),
    }).catch((err: unknown) => {
      console.error("Failed to save preferred currency:", err);
    });
    saveCurrency(next);
    setCurrency(next);
  }

  return (
    <Select
      value={currency}
      onChange={handleChange}
      options={options}
      className="w-full"
      ariaLabel={labels.select.ariaCurrency}
    />
  );
}

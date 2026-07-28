import { useState } from "react";
import Select from "@/components/ui/Select.tsx";
import { saveCurrency, type Currency } from "@/lib/ui/currency.ts";

const options = [
  { value: "EUR", label: "EUR €" },
  { value: "MXN", label: "MXN $" },
  { value: "USD", label: "USD $" },
];

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
    }).catch(() => {});
    saveCurrency(next);
    setCurrency(next);
  }

  return (
    <Select
      value={currency}
      onChange={handleChange}
      options={options}
      className="w-full"
      ariaLabel="Moneda"
    />
  );
}

import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";
import DollarIcon from "@/assets/dollar.svg?react";
import { getCurrency, saveCurrency, type Currency } from "@/lib/ui/currency.ts";

const options = [
  { value: "EUR", label: "EUR €" },
  { value: "MXN", label: "MXN $" },
  { value: "USD", label: "USD $" },
];

export default function CurrencySelect() {
  const [currency, setCurrency] = useState<Currency>("MXN");

  useEffect(() => {
    fetch("/api/users/currency")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.currency && ["EUR", "MXN", "USD"].includes(data.currency)) {
          saveCurrency(data.currency as Currency);
          setCurrency(data.currency as Currency);
        } else {
          setCurrency(getCurrency());
        }
      })
      .catch(() => setCurrency(getCurrency()));
  }, []);

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
      icon={<DollarIcon className="w-4 h-4 text-nav" />}
    />
  );
}

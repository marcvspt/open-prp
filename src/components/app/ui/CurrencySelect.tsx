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
    setCurrency(getCurrency());
  }, []);

  function handleChange(value: string) {
    const next = value as Currency;
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

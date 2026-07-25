import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";
import DollarIcon from "@/assets/DollarIcon.svg?react";

type Currency = "EUR" | "MXN" | "USD";

function getSaved(): Currency {
  try {
    const stored = localStorage.getItem("currency");
    if (stored === "EUR" || stored === "MXN" || stored === "USD") return stored;
  } catch {}
  return "MXN";
}

function saveCurrency(pref: Currency) {
  try { localStorage.setItem("currency", pref); } catch {}
}

export function getCurrency(): Currency {
  return getSaved();
}

const options = [
  { value: "EUR", label: "EUR €" },
  { value: "MXN", label: "MXN $" },
  { value: "USD", label: "USD $" },
];

export default function CurrencySelect() {
  const [currency, setCurrency] = useState<Currency>("MXN");

  useEffect(() => {
    setCurrency(getSaved());
  }, []);

  const change = (val: string) => {
    const c = val as Currency;
    saveCurrency(c);
    setCurrency(c);
  };

  return (
    <div className="px-3 py-2 w-full">
      <Select value={currency} onChange={change} options={options} className="w-full"
        icon={<DollarIcon className="w-4 h-4 text-nav" />}
      />
    </div>
  );
}

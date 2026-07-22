import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";

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
      <Select value={currency} onChange={change} options={options} class="w-full"
        icon={<svg className="w-4 h-4 text-nav" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>}
      />
    </div>
  );
}

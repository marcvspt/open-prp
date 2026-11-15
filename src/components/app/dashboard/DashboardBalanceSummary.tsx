import { useState } from "react";
import Select from "@/components/ui/Select.tsx";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict, type LocaleCode } from "@/lib/i18n/locale.ts";
import { formatAmount } from "@/lib/format.ts";
import type { DashboardBalance } from "@/lib/types/dashboard.ts";

interface Props {
  balances: DashboardBalance[];
  preferredCurrency?: string | null;
  creditCardCount: number;
  hasUnassignedCarryover: boolean;
  locale: LocaleCode;
}

export default function DashboardBalanceSummary({ balances, preferredCurrency, creditCardCount, hasUnassignedCarryover, locale }: Props) {
  const t = getLocaleDict(locale);
  const [selected, setSelected] = useState(preferredCurrency ?? "MXN");
  const balance = balances.find(item => item.currency === selected) ?? balances[0]
    ?? { currency: selected, income: 0, expense: 0, installments: 0, recurringExpenses: 0 };
  const net = balance.income - balance.expense;
  const format = (amount: number) => formatAmount(amount, locale, balance.currency, true);
  const metrics = [
    { label: t.dashboard.statIncomes, value: format(balance.income), color: "text-success" },
    { label: t.dashboard.statExpenses, value: format(-balance.expense), color: "text-danger" },
    { label: t.dashboard.statBalance, value: format(net), color: net >= 0 ? "text-success" : "text-danger" },
    { label: t.dashboard.statCreditCards, value: creditCardCount, color: "text-primary" },
    { label: t.dashboard.statInstallments, value: format(-balance.installments), color: "text-warning" },
    { label: t.dashboard.statRecurringExpenses, value: format(-balance.recurringExpenses), color: "text-danger" },
  ];

  return (
    <LocaleProvider locale={locale}>
      {balances.length > 1 && (
        <div className="mb-3 flex justify-end">
          <Select
            value={balance.currency}
            onChange={setSelected}
            ariaLabel={t.field.currency}
            options={balances.map(({ currency }) => ({ value: currency, label: currency }))}
          />
        </div>
      )}
      {hasUnassignedCarryover && <p className="mb-3 text-sm text-warning-text">{t.dashboard.unassignedCarryover}</p>}
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6" aria-live="polite">
        {metrics.map(({ label, value, color }) => (
          <div key={label} className="min-w-0 rounded-xl border border-border bg-panel p-4 shadow-sm">
            <dt className="text-xs uppercase tracking-wider text-string-muted">{label}</dt>
            <dd className={`mt-1 wrap-anywhere text-xl font-bold tabular-nums ${color}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </LocaleProvider>
  );
}

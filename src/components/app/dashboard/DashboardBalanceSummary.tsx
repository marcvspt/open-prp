import { useState } from "react";
import Select from "@/components/ui/Select.tsx";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict, type LocaleCode } from "@/lib/i18n/locale.ts";
import { formatAmount } from "@/lib/format.ts";
import type { DashboardBalance } from "@/lib/types/dashboard.ts";

interface Props {
  balances: DashboardBalance[];
  preferredCurrency?: string | null;
  hasUnassignedCarryover: boolean;
  locale: LocaleCode;
}

export default function DashboardBalanceSummary({ balances, preferredCurrency, hasUnassignedCarryover, locale }: Props) {
  const t = getLocaleDict(locale);
  const [selected, setSelected] = useState(preferredCurrency ?? "MXN");
  const balance = balances.find(item => item.currency === selected) ?? balances[0]
    ?? { currency: selected, income: 0, expense: 0, installments: 0, recurringExpenses: 0 };
  const net = balance.income - balance.expense;
  const format = (amount: number) => formatAmount(amount, locale, balance.currency, true);
  const cashFlow = [
    { label: t.dashboard.statIncomes, amount: balance.income, color: "text-success-text" },
    { label: t.dashboard.statExpenses, amount: -balance.expense, color: "text-danger-text" },
  ];
  const commitments = [
    { label: t.dashboard.statInstallments, amount: -balance.installments },
    { label: t.dashboard.statRecurringExpenses, amount: -balance.recurringExpenses },
  ];

  return (
    <LocaleProvider locale={locale}>
      <div className="overflow-hidden rounded-xl border border-border bg-panel shadow-sm">
        {balances.length > 1 && (
          <div className="flex justify-end border-b border-border px-4 py-2">
            <Select
              value={balance.currency}
              onChange={setSelected}
              ariaLabel={t.field.currency}
              options={balances.map(({ currency }) => ({ value: currency, label: currency }))}
            />
          </div>
        )}
        <div aria-live="polite">
          <dl className="grid grid-cols-2 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
            <div className="min-w-0 border-border bg-surface/50 p-4 sm:p-5 max-md:col-span-2 max-md:border-b md:border-e">
              <dt className="text-sm font-semibold text-string">{t.dashboard.statBalance}</dt>
              <dd className={`mt-1 wrap-anywhere text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${net >= 0 ? "text-success-text" : "text-danger-text"}`}>
                {format(net)}
              </dd>
            </div>
            {cashFlow.map(({ label, amount, color }) => (
              <div key={label} className="min-w-0 p-4 not-last:border-e not-last:border-border sm:p-5">
                <dt className="text-sm font-medium text-string-muted">{label}</dt>
                <dd className={`mt-1 wrap-anywhere text-lg font-semibold tabular-nums sm:text-xl ${color}`}>{format(amount)}</dd>
              </div>
            ))}
          </dl>
          <dl className="grid grid-cols-2 border-t border-border">
            {commitments.map(({ label, amount }) => (
              <div key={label} className="min-w-0 px-4 py-3 first:border-e first:border-border sm:px-5 md:flex md:items-baseline md:justify-between md:gap-3">
                <dt className="text-xs font-medium text-string-muted">{label}</dt>
                <dd className="mt-1 min-w-0 wrap-anywhere text-base font-semibold tabular-nums text-string md:mt-0">{format(amount)}</dd>
              </div>
            ))}
          </dl>
        </div>
        {hasUnassignedCarryover && (
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <p className="text-sm text-warning-text">{t.dashboard.unassignedCarryover}</p>
          </div>
        )}
      </div>
    </LocaleProvider>
  );
}

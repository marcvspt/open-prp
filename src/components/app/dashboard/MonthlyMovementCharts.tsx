import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Select from "@/components/ui/Select.tsx";
import { chartAmountFormatters } from "@/lib/format.ts";
import { displayCategoryName } from "@/lib/i18n/category-labels.ts";
import type { Locale } from "@/lib/i18n/es.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict, type LocaleCode } from "@/lib/i18n/locale.ts";
import { displayPaymentMethodName } from "@/lib/i18n/payment-method-labels.ts";
import type { MovementBreakdownGroup, MovementRanking, PaymentMethodActivity } from "@/lib/types/dashboard.ts";

const pieColors = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-info)",
  "var(--color-danger)",
  "color-mix(in oklab, var(--color-primary), var(--color-danger))",
  "color-mix(in oklab, var(--color-success), var(--color-info))",
  "color-mix(in oklab, var(--color-warning), var(--color-danger))",
  "color-mix(in oklab, var(--color-warning), var(--color-success))",
  "color-mix(in oklab, var(--color-primary), var(--color-info))",
];
const axisTick = { fill: "var(--color-string-muted)", fontSize: 12 };

function RankedMovementPie({ ranking, title, t, formatAmount }: {
  ranking: MovementRanking;
  title: string;
  t: Locale;
  formatAmount: (value: number) => string;
}) {
  const sources = {
    transaction: t.dashboard.unnamedTransaction,
    installment: t.field.monthlyFee,
    recurring: t.nav.recurringPayments,
    cashback: t.nav.cashback,
  };
  const rows = ranking.movements.map((movement, index) => ({
    name: movement.description ?? sources[movement.source],
    detail: `${t.field.category}: ${movement.category ? displayCategoryName(movement.category, t) : t.field.noCategory}`,
    amount: movement.amount,
    fill: pieColors[index] ?? "var(--color-primary)",
  }));
  if (ranking.remainder.count > 0) {
    rows.push({
      name: t.dashboard.otherMovements,
      detail: t.dashboard.remainingMovementCount(ranking.remainder.count),
      amount: ranking.remainder.amount,
      fill: "var(--color-string-muted)",
    });
  }

  return (
    <section className="min-w-0 rounded-xl border border-border bg-panel p-4 shadow-sm">
      <h3 className="text-base font-semibold text-string">{title}</h3>
      {rows.length ? (
        <>
          <ResponsiveContainer width="100%" height={224}>
            <PieChart accessibilityLayer title={title}>
              <Pie data={rows} dataKey="amount" nameKey="name" outerRadius="87%" stroke="var(--color-panel)" strokeWidth={2} isAnimationActive={false} />
              <Tooltip content={({ active, activeIndex }) => {
                const row = activeIndex == null ? undefined : rows[Number(activeIndex)];
                if (!active || !row) return null;
                return (
                  <div role="status" className="max-w-56 space-y-1 rounded-lg border border-border bg-panel p-2 text-xs shadow-sm">
                    <p className="font-semibold text-string wrap-anywhere">{row.name}</p>
                    <p className="text-string-muted wrap-anywhere">{row.detail}</p>
                    <p className="font-medium tabular-nums text-string">{formatAmount(row.amount)}</p>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <ol className="space-y-2 text-sm">
            {rows.map((row, index) => (
              <li key={index} className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.fill }} />
                  <div className="min-w-0 wrap-anywhere">
                    <p className="text-string">{row.name}</p>
                    <p className="text-xs text-string-muted">{row.detail}</p>
                  </div>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-string">{formatAmount(row.amount)}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-2 text-sm text-string-muted">{t.dashboard.noRankingMovements}</p>
      )}
    </section>
  );
}

function PaymentMethodBars({ rows, title, color, t, formatAmount, axisAmount }: {
  rows: Array<{ key: string; label: string; amount: number }>;
  title: string;
  color: string;
  t: Locale;
  formatAmount: (value: number) => string;
  axisAmount: Intl.NumberFormat;
}) {
  const labels = new Map(rows.map(row => [row.key, row.label]));

  return (
    <section className="min-w-0 rounded-xl border border-border bg-panel p-4 shadow-sm">
      <h3 className="text-base font-semibold text-string">{title}</h3>
      {rows.length ? (
        <ResponsiveContainer width="100%" height={Math.max(136, rows.length * 36 + 40)}>
          <BarChart data={rows} layout="vertical" accessibilityLayer title={title}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={value => axisAmount.format(Number(value))} tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="key" width={108} interval={0} tick={axisTick} axisLine={false} tickLine={false}
              tickFormatter={(key: string) => {
                const label = labels.get(key) ?? "";
                return label.length > 15 ? `${label.slice(0, 14)}…` : label;
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-alt)" }}
              contentStyle={{ background: "var(--color-panel)", borderColor: "var(--color-border)", borderRadius: "0.5rem" }}
              labelStyle={{ color: "var(--color-string)" }}
              itemStyle={{ color: "var(--color-string-muted)" }}
              labelFormatter={key => labels.get(String(key)) ?? ""}
              formatter={value => formatAmount(Number(value))}
            />
            <Bar dataKey="amount" name={t.field.amount} fill={color} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="mt-2 text-sm text-string-muted">{t.dashboard.noPaymentMethodMovements}</p>
      )}
    </section>
  );
}

interface Props {
  groups: MovementBreakdownGroup[];
  preferredCurrency?: string;
  locale: LocaleCode;
}

export default function MonthlyMovementCharts({ groups, preferredCurrency, locale }: Props) {
  const t = getLocaleDict(locale);
  const [currency, setCurrency] = useState(() =>
    groups.find(group => group.currency === preferredCurrency)?.currency ?? groups[0]?.currency ?? ""
  );
  const group = groups.find(group => group.currency === currency);
  if (!group) return null;

  const { formatAmount, axisAmount } = chartAmountFormatters(locale, currency);
  const cardLabels = {
    credit: t.dashboard.statCreditCards,
    debit: t.dashboard.debitCards,
    voucher: t.badge.voucherFull,
  };
  const labels = (row: PaymentMethodActivity) => {
    if (row.cardName !== undefined) return row.cardName;
    if (row.cardType) return cardLabels[row.cardType];
    return row.method ? displayPaymentMethodName(row.method, t) : t.dashboard.unassignedPaymentMethod;
  };
  const series = [
    { key: "expense", rankingTitle: t.dashboard.topExpenses, methodsTitle: t.dashboard.expensesByMethod, color: "var(--color-danger)" },
    { key: "income", rankingTitle: t.dashboard.topIncomes, methodsTitle: t.dashboard.incomesByMethod, color: "var(--color-success)" },
  ] as const;

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-3">
        <div className="flex justify-end">
          {groups.length > 1 ? (
            <Select value={currency} onChange={setCurrency}
              options={groups.map(({ currency: code }) => ({ value: code, label: code }))}
              ariaLabel={t.select.ariaCurrency} className="w-28"
            />
          ) : (
            <span className="text-xs font-medium text-string-muted">{currency}</span>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {series.map(({ key, rankingTitle }) => (
            <RankedMovementPie key={key} ranking={group[key]} title={rankingTitle} t={t} formatAmount={formatAmount} />
          ))}
          {series.map(({ key, methodsTitle, color }) => {
            const rows = group.paymentMethods.filter(row => row[key] !== 0)
              .map(row => ({ key: row.key, label: labels(row), amount: row[key] }))
              .sort((a, b) => b.amount - a.amount);
            return <PaymentMethodBars key={methodsTitle} rows={rows} title={methodsTitle} color={color} t={t} formatAmount={formatAmount} axisAmount={axisAmount} />;
          })}
        </div>
      </div>
    </LocaleProvider>
  );
}

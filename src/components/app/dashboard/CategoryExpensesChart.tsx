import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Select from "@/components/ui/Select.tsx";
import { chartAmountFormatters } from "@/lib/format.ts";
import { displayCategoryName } from "@/lib/i18n/category-labels.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict, type LocaleCode } from "@/lib/i18n/locale.ts";
import type { CategoryExpenseGroup } from "@/lib/types/dashboard.ts";

interface Props {
  groups: CategoryExpenseGroup[];
  preferredCurrency?: string;
  locale: LocaleCode;
}

export default function CategoryExpensesChart({ groups, preferredCurrency, locale }: Props) {
  const t = getLocaleDict(locale);
  const [currency, setCurrency] = useState(() =>
    groups.find(group => group.currency === preferredCurrency)?.currency ?? groups[0]?.currency ?? ""
  );
  const group = groups.find(group => group.currency === currency);
  if (!group) return null;

  const rows = group.categories.map(row => ({
    ...row,
    key: row.categoryId ?? "uncategorized",
    label: row.category ? displayCategoryName(row.category, t) : t.field.noCategory,
  }));
  const rowsByKey = new Map(rows.map(row => [row.key, row]));
  const top = rows[0];
  const { formatAmount, axisAmount } = chartAmountFormatters(locale, currency);
  const series = [
    { key: "transactions", label: t.nav.transactions, color: "var(--color-primary)" },
    { key: "installments", label: t.nav.installments, color: "var(--color-success)" },
    { key: "recurring", label: t.nav.recurringPayments, color: "var(--color-warning)" },
  ];

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {top && (
            <div className="min-w-0">
              <p className="font-semibold text-string wrap-anywhere">{top.label}</p>
              <p className="text-xl font-bold tabular-nums text-string">{formatAmount(top.total)}</p>
            </div>
          )}
          {groups.length > 1 && (
            <Select
              value={currency}
              onChange={setCurrency}
              options={groups.map(({ currency: code }) => ({ value: code, label: code }))}
              ariaLabel={t.select.ariaCurrency}
              className="w-28"
            />
          )}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-string-muted">
          {series.map(({ key, label, color }) => (
            <li key={key} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </li>
          ))}
        </ul>
        <ResponsiveContainer width="100%" height={Math.max(136, rows.length * 36 + 40)}>
          <BarChart data={rows} layout="vertical" stackOffset="sign" accessibilityLayer title={t.dashboard.categoryExpensesTitle}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={value => axisAmount.format(Number(value))} tick={{ fill: "var(--color-string-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="key"
              width={108}
              interval={0}
              tickFormatter={(key: string) => {
                const label = rowsByKey.get(key)?.label ?? "";
                return label.length > 15 ? `${label.slice(0, 14)}…` : label;
              }}
              tick={{ fill: "var(--color-string-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-alt)" }}
              contentStyle={{ background: "var(--color-panel)", borderColor: "var(--color-border)", borderRadius: "0.5rem" }}
              labelStyle={{ color: "var(--color-string)" }}
              itemStyle={{ color: "var(--color-string-muted)" }}
              labelFormatter={key => {
                const row = rowsByKey.get(String(key));
                return row ? `${row.label} · ${formatAmount(row.total)}` : "";
              }}
              formatter={value => formatAmount(Number(value))}
            />
            {series.map(({ key, label, color }) => (
              <Bar key={key} dataKey={key} name={label} fill={color} stackId="expense" maxBarSize={22} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </LocaleProvider>
  );
}

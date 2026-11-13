import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Select from "@/components/ui/Select.tsx";
import { formatDate } from "@/lib/date.ts";
import { chartAmountFormatters } from "@/lib/format.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict, type LocaleCode } from "@/lib/i18n/locale.ts";
import type { DailyActivityGroup } from "@/lib/types/dashboard.ts";

interface Props {
  groups: DailyActivityGroup[];
  preferredCurrency?: string;
  locale: LocaleCode;
}

export default function DailyActivityChart({ groups, preferredCurrency, locale }: Props) {
  const t = getLocaleDict(locale);
  const [currency, setCurrency] = useState(() =>
    groups.find(group => group.currency === preferredCurrency)?.currency ?? groups[0]?.currency ?? ""
  );
  const group = groups.find(group => group.currency === currency);
  if (!group) return null;

  const { formatAmount, axisAmount } = chartAmountFormatters(locale, currency);
  const series = [
    { key: "income", label: t.dashboard.statIncomes, color: "var(--color-success)", dashed: false },
    { key: "expense", label: t.dashboard.statExpenses, color: "var(--color-danger)", dashed: true },
  ] as const;

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-string-muted">
            {series.map(({ key, label, color, dashed }) => (
              <li key={key} className="flex items-center gap-2">
                <span aria-hidden="true" className="w-4 border-t-2" style={{ borderColor: color, borderTopStyle: dashed ? "dashed" : "solid" }} />
                {label}
              </li>
            ))}
          </ul>
          {groups.length > 1 ? (
            <Select
              value={currency}
              onChange={setCurrency}
              options={groups.map(({ currency: code }) => ({ value: code, label: code }))}
              ariaLabel={t.select.ariaCurrency}
              className="w-28"
            />
          ) : (
            <span className="text-xs font-medium text-string-muted">{currency}</span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={group.days} accessibilityLayer title={t.dashboard.dailyActivityTitle}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              interval="preserveStartEnd"
              minTickGap={14}
              tickFormatter={(date: string) => formatDate(date, locale, { day: "numeric", month: "short" })}
              tick={{ fill: "var(--color-string-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis width={48} tickFormatter={value => axisAmount.format(Number(value))} tick={{ fill: "var(--color-string-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--color-panel)", borderColor: "var(--color-border)", borderRadius: "0.5rem" }}
              labelStyle={{ color: "var(--color-string)" }}
              itemStyle={{ color: "var(--color-string-muted)" }}
              labelFormatter={date => typeof date === "string" ? formatDate(date, locale, { day: "numeric", month: "long", year: "numeric" }) : ""}
              formatter={value => formatAmount(Number(value))}
            />
            {series.map(({ key, label, color, dashed }) => (
              <Area
                key={key}
                dataKey={key}
                name={label}
                type="monotoneX"
                stroke={color}
                strokeWidth={2}
                strokeDasharray={dashed ? "5 3" : undefined}
                fill={color}
                fillOpacity={0.18}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </LocaleProvider>
  );
}

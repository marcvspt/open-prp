import { getMonthOptions, monthLabel } from "@/lib/date.ts";
import Select from "@/components/ui/Select.tsx";
import { FILTER_LABEL_MONTH } from "@/lib/i18n/filter-fields.ts";
import { useLocaleDict } from "@/lib/i18n/LocaleProvider.tsx";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Props {
  value: string;
  onChange: (month: string) => void;
  count?: number;
  createdAt?: string;
  allLabel?: string;
  locale?: LocaleCode;
}

export default function MonthSelector({ value, onChange, count = 12, createdAt, allLabel, locale = "es" }: Props) {
  const t = useLocaleDict();
  const months = getMonthOptions(count, createdAt);
  const options = allLabel ? [{ value: "", label: allLabel }, ...months.map(m => ({ value: m, label: monthLabel(m, locale) }))] : months.map(m => ({ value: m, label: monthLabel(m, locale) }));
  return (
    <div className="w-full sm:w-48">
      <Select
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={FILTER_LABEL_MONTH(t)}
      />
    </div>
  );
}
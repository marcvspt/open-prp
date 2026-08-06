import Select from "@/components/ui/Select.tsx";
import { FILTER_LABEL_FILTER } from "@/lib/i18n/filter-fields.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface FilterSelectProps {
  filters: { value: string; label: string; href: string }[];
  active: string;
  className?: string;
  locale?: LocaleCode;
}

export default function FilterSelect({ filters, active, className, locale = "es" }: FilterSelectProps) {
  const t = getLocaleDict(locale);
  return (
    <LocaleProvider locale={locale}>
      <div className={className}>
        <Select
          value={active}
          onChange={(v) => {
            const f = filters.find(f => f.value === v);
            if (f) location.href = f.href;
          }}
          options={filters.map(f => ({ value: f.value, label: f.label }))}
          ariaLabel={FILTER_LABEL_FILTER(t)}
        />
      </div>
    </LocaleProvider>
  );
}

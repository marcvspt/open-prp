import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/app/ui/LoadingSpinner.tsx";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const resetLoading = () => setLoading(false);
    window.addEventListener("pageshow", resetLoading);
    return () => window.removeEventListener("pageshow", resetLoading);
  }, []);

  return (
    <LocaleProvider locale={locale}>
      <div className={className}>
        <div className="flex items-center gap-2">
          <Select
            value={active}
            onChange={value => {
              const filter = filters.find(item => item.value === value);
              if (!filter || value === active) return;
              setLoading(true);
              location.href = filter.href;
            }}
            options={filters.map(f => ({ value: f.value, label: f.label }))}
            ariaLabel={FILTER_LABEL_FILTER(t)}
            disabled={loading}
            className="min-w-0 flex-1"
          />
          {loading && <LoadingSpinner label={t.common.loading} />}
        </div>
      </div>
    </LocaleProvider>
  );
}

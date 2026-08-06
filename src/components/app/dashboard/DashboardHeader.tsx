import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Props {
  initialMonth: string;
  createdAt?: string;
  locale?: LocaleCode;
}

export default function DashboardHeader({ initialMonth, createdAt, locale = "es" }: Props) {
  function onMonthChange(m: string) {
    const params = new URLSearchParams(location.search);
    if (m) params.set("month", m);
    else params.delete("month");
    window.location.search = params.toString();
  }

  return (
    <LocaleProvider locale={locale}>
      <div className="flex justify-end">
        <MonthSelector value={initialMonth} onChange={onMonthChange} createdAt={createdAt} locale={locale} />
      </div>
    </LocaleProvider>
  );
}

import { useState } from "react";
import TabBar from "@/components/app/ui/TabBar.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import { currentMonthStr } from "@/lib/date.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  initialTab: string;
  defaultTab: string;
  ariaLabel: string;
  initialMonth: string;
  createdAt?: string;
  allLabel?: string;
  locale?: LocaleCode;
}

export default function TabBarWithMonth({ tabs, initialTab, defaultTab, ariaLabel, initialMonth, createdAt, allLabel, locale = "es" }: Props) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [month, setMonth] = useState(initialMonth);

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    const params = new URLSearchParams(location.search);
    if (newMonth) params.set("month", newMonth);
    else params.delete("month");
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
    window.dispatchEvent(new CustomEvent("monthchange", { detail: { month: newMonth } }));
  }

  function handleTabChange(key: string) {
    setActiveTab(key);
    if (key !== "history" && !month) {
      const fallback = currentMonthStr();
      setMonth(fallback);
      const params = new URLSearchParams(location.search);
      params.set("month", fallback);
      const qs = params.toString();
      history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
      window.dispatchEvent(new CustomEvent("monthchange", { detail: { month: fallback } }));
    }
  }

  const isHistoryTab = activeTab === "history";
  const monthValue = isHistoryTab ? month : (month || currentMonthStr());

  return (
    <LocaleProvider locale={locale}>
      <TabBar
        tabs={tabs}
        initialTab={initialTab}
        defaultTab={defaultTab}
        ariaLabel={ariaLabel}
        onChange={handleTabChange}
        monthSelector={<MonthSelector value={monthValue} onChange={handleMonthChange} createdAt={createdAt} allLabel={isHistoryTab ? allLabel : undefined} locale={locale} />}
      />
    </LocaleProvider>
  );
}

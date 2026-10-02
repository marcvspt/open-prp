import { useState, useEffect } from "react";
import TabBar from "@/components/app/ui/TabBar.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";
import { currentMonthStr, isAvailableMonth } from "@/lib/date.ts";
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
  monthParam?: string;
  monthTabs?: readonly string[];
}

export default function TabBarWithMonth({ tabs, initialTab, defaultTab, ariaLabel, initialMonth, createdAt, allLabel, locale = "es", monthParam = "month", monthTabs }: Props) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [month, setMonth] = useState(initialMonth);

  useEffect(() => {
    function restoreMonth() {
      const url = new URL(location.href);
      const raw = url.searchParams.get(monthParam) || "";
      const valid = !raw || isAvailableMonth(raw, createdAt);
      const next = valid ? raw : "";
      if (!valid) {
        url.searchParams.delete(monthParam);
        history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
      setMonth(next);
      window.dispatchEvent(new CustomEvent("monthchange", { detail: { month: next } }));
    }
    window.addEventListener("popstate", restoreMonth);
    return () => window.removeEventListener("popstate", restoreMonth);
  }, [createdAt, monthParam]);

  function handleMonthChange(newMonth: string) {
    if (newMonth && !isAvailableMonth(newMonth, createdAt)) return;
    setMonth(newMonth);
    const params = new URLSearchParams(location.search);
    if (newMonth && !(monthParam !== "month" && newMonth === currentMonthStr())) params.set(monthParam, newMonth);
    else params.delete(monthParam);
    const qs = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
    window.dispatchEvent(new CustomEvent("monthchange", { detail: { month: newMonth } }));
  }

  function handleTabChange(key: string) {
    setActiveTab(key);
    if ((!monthTabs || monthTabs.includes(key)) && key !== "history" && !month) {
      handleMonthChange(currentMonthStr());
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
        monthSelector={(!monthTabs || monthTabs.includes(activeTab)) ? <MonthSelector value={monthValue} onChange={handleMonthChange} createdAt={createdAt} allLabel={isHistoryTab ? allLabel : undefined} locale={locale} /> : undefined}
      />
    </LocaleProvider>
  );
}

import { useState } from "react";
import TabBar from "./TabBar";
import MonthSelector from "./MonthSelector";
import { currentMonthStr } from "@/lib/date.ts";

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
}

export default function TabBarWithMonth({ tabs, initialTab, defaultTab, ariaLabel, initialMonth, createdAt, allLabel }: Props) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [month, setMonth] = useState(initialMonth);

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    const params = new URLSearchParams(location.search);
    if (newMonth) params.set("month", newMonth);
    else params.delete("month");
    window.location.href = "?" + params.toString();
  }

  function handleTabChange(key: string) {
    setActiveTab(key);
    if (key !== "history" && !month) {
      const fallback = currentMonthStr();
      setMonth(fallback);
      const params = new URLSearchParams(location.search);
      params.set("month", fallback);
      history.replaceState(null, "", "?" + params.toString());
    }
  }

  const isHistoryTab = activeTab === "history";
  const monthValue = isHistoryTab ? month : (month || currentMonthStr());

  return (
    <TabBar
      tabs={tabs}
      initialTab={initialTab}
      defaultTab={defaultTab}
      ariaLabel={ariaLabel}
      onChange={handleTabChange}
      monthSelector={<MonthSelector value={monthValue} onChange={handleMonthChange} createdAt={createdAt} allLabel={isHistoryTab ? allLabel : undefined} />}
    />
  );
}

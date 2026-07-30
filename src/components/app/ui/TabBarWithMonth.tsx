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
}

export default function TabBarWithMonth({ tabs, initialTab, defaultTab, ariaLabel, initialMonth, createdAt }: Props) {
  const [month, setMonth] = useState(initialMonth);

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    const params = new URLSearchParams(location.search);
    if (newMonth !== currentMonthStr()) params.set("month", newMonth);
    else params.delete("month");
    window.location.href = "?" + params.toString();
  }

  return (
    <TabBar
      tabs={tabs}
      initialTab={initialTab}
      defaultTab={defaultTab}
      ariaLabel={ariaLabel}
      monthSelector={<MonthSelector value={month} onChange={handleMonthChange} createdAt={createdAt} />}
    />
  );
}

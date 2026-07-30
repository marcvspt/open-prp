import TabBar from "@/components/app/ui/TabBar.tsx";
import MonthSelector from "@/components/app/ui/MonthSelector.tsx";

interface Props {
  initialMonth: string;
  initialTab: string;
  createdAt?: string;
}

const DASHBOARD_TABS = [
  { key: "summary", label: "Resumen" },
  { key: "events", label: "Eventos" },
  { key: "tasks", label: "Tareas" },
];

export default function DashboardHeader({ initialMonth, initialTab, createdAt }: Props) {
  function onMonthChange(m: string) {
    const params = new URLSearchParams(location.search);
    if (m) params.set("month", m);
    else params.delete("month");
    window.location.href = `?${params.toString()}`;
  }

  return (
    <TabBar
      tabs={DASHBOARD_TABS}
      initialTab={initialTab}
      defaultTab="summary"
      ariaLabel="Secciones del dashboard"
      monthSelector={
        <MonthSelector value={initialMonth} onChange={onMonthChange} createdAt={createdAt} />
      }
    />
  );
}

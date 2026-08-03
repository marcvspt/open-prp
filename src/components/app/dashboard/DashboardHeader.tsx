import MonthSelector from "@/components/app/ui/MonthSelector.tsx";

interface Props {
  initialMonth: string;
  createdAt?: string;
}

export default function DashboardHeader({ initialMonth, createdAt }: Props) {
  function onMonthChange(m: string) {
    const params = new URLSearchParams(location.search);
    if (m) params.set("month", m);
    else params.delete("month");
    window.location.search = params.toString();
  }

  return (
    <div className="flex justify-end">
      <MonthSelector value={initialMonth} onChange={onMonthChange} createdAt={createdAt} />
    </div>
  );
}

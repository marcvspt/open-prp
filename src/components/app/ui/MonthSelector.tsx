import { getMonthOptions, monthLabel } from "@/lib/date.ts";
import Select from "@/components/ui/Select.tsx";

interface Props {
  value: string;
  onChange: (month: string) => void;
  count?: number;
  createdAt?: string;
  allLabel?: string;
}

export default function MonthSelector({ value, onChange, count = 12, createdAt, allLabel }: Props) {
  const months = getMonthOptions(count, createdAt);
  const options = allLabel ? [{ value: "", label: allLabel }, ...months.map(m => ({ value: m, label: monthLabel(m) }))] : months.map(m => ({ value: m, label: monthLabel(m) }));
  return (
    <div className="w-full sm:w-48">
      <Select
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel="Mes"
      />
    </div>
  );
}
import { getMonthOptions, monthLabel } from "@/lib/date.ts";
import Select from "@/components/ui/Select.tsx";

interface Props {
  value: string;
  onChange: (month: string) => void;
  count?: number;
}

export default function MonthSelector({ value, onChange, count = 12 }: Props) {
  const months = getMonthOptions(count);
  return (
    <div className="w-full sm:w-48">
      <Select
        value={value}
        onChange={onChange}
        options={months.map(m => ({ value: m, label: monthLabel(m) }))}
      />
    </div>
  );
}
import Select from "@/components/ui/Select.tsx";

interface FilterSelectProps {
  filters: { value: string; label: string; href: string }[];
  active: string;
}

export default function FilterSelect({ filters, active }: FilterSelectProps) {
  return (
    <Select
      value={active}
      onChange={(v) => {
        const f = filters.find(f => f.value === v);
        if (f) location.href = f.href;
      }}
      options={filters.map(f => ({ value: f.value, label: f.label }))}
      ariaLabel="Filtrar"
    />
  );
}

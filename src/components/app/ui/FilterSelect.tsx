import Select from "@/components/ui/Select.tsx";

interface FilterSelectProps {
  filters: { value: string; label: string; href: string }[];
  active: string;
  className?: string;
}

export default function FilterSelect({ filters, active, className }: FilterSelectProps) {
  return (
    <div className={className}>
      <Select
        value={active}
        onChange={(v) => {
          const f = filters.find(f => f.value === v);
          if (f) location.href = f.href;
        }}
        options={filters.map(f => ({ value: f.value, label: f.label }))}
        ariaLabel="Filtrar"
      />
    </div>
  );
}

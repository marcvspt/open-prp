import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import type { PantryItem } from "@/lib/types/pantry.ts";
import { FILTER_WRAP_CLASS, FILTER_INPUT_CLASS, FILTER_LIMPIAR_CLASS, FILTER_GRID_CLASS, FILTER_CTA_CLASS, BTN_CLEAR, BTN_EDIT, BTN_DELETE } from "@/lib/form-fields.ts";

interface Props {
  categories: { id: string; icon: string | null; name: string }[];
  initialData?: string;
}

export default function PantryFilterable({ categories, initialData }: Props) {
  const parsedInitial = initialData ? JSON.parse(initialData) as PantryItem[] : undefined;
  const { filters, setFilter, clearFilters, data, loading } = useFilteredData<PantryItem[]>("/api/pantry", {}, parsedInitial);

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className={FILTER_GRID_CLASS}>
          <div className={`${FILTER_WRAP_CLASS} col-span-2 sm:col-span-1`}>
            <Select
              value={filters.category_id || ""}
              onChange={(v) => setFilter("category_id", v)}
              options={[{ value: "", label: "Todas las categorías" }, ...categories.map(c => ({ value: c.id, label: `${c.icon || "📦"} ${c.name}` }))]}
              placeholder="Categoría"
              ariaLabel="Categoría"
            />
          </div>
          <input
            type="search"
            data-search-input
            defaultValue={filters.q || ""}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Buscar por artículo o nota..."
            className={FILTER_INPUT_CLASS}
          />
          <button onClick={clearFilters} className={FILTER_LIMPIAR_CLASS}>{BTN_CLEAR}</button>
        </div>
        <button data-create="pantry" className={FILTER_CTA_CLASS}>Nuevo producto</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        {loading ? (
          <div className="p-4 text-center text-string-muted text-sm">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-string-muted text-sm">Sin productos en la despensa</div>
        ) : (
          <table className="w-full text-sm" aria-label="Despensa">
            <thead>
              <tr className="text-xs uppercase text-string-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Artículo</th>
                <th className="text-left px-4 py-3 font-medium">Cant.</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 font-medium">Notas</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const cat = categories.find(c => c.id === i.category_id);
                return (
                  <tr key={i.id} className="hover:bg-nav-hover border-b border-border/50">
                    <td className="px-4 py-3 font-medium">{i.description}</td>
                    <td className="px-4 py-3">{i.quantity}</td>
                    <td className="px-4 py-3">{cat ? <span className="text-xs bg-surface-alt px-2 py-0.5 rounded">{cat.icon || "📦"} {cat.name}</span> : "-"}</td>
                    <td className="px-4 py-3 text-string-muted text-sm">{i.notes || "-"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      <button data-edit-pantry={i.id} className="text-primary hover:text-primary-hover text-xs font-medium cursor-pointer">{BTN_EDIT}</button>
                      <button data-delete-pantry={i.id} className="text-danger hover:text-danger-hover text-xs font-medium cursor-pointer">{BTN_DELETE}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

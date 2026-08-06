import { useFilteredData } from "@/lib/ui/useFilteredData.ts";
import Select from "@/components/ui/Select.tsx";
import type { PantryItem } from "@/lib/types/pantry.ts";
import { FILTER_WRAP_CLASS, FILTER_INPUT_CLASS, FILTER_LIMPIAR_CLASS, FILTER_GRID_CLASS, FILTER_CTA_CLASS, BTN_CLEAR, FILTER_ALL_CATEGORIES, FILTER_SEARCH_PANTRY, FILTER_LABEL_CATEGORY } from "@/lib/i18n/filter-fields.ts";
import { BTN_EDIT, BTN_DELETE } from "@/lib/i18n/general-fields.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Props {
  categories: { id: string; icon: string | null; name: string }[];
  initialData?: string;
  locale?: LocaleCode;
}

export default function PantryFilterable({ categories, initialData, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const parsedInitial = initialData ? JSON.parse(initialData) as PantryItem[] : undefined;
  const { filters, setFilter, clearFilters, data, loading, error } = useFilteredData<PantryItem[]>("/api/pantry", {}, parsedInitial);

  const items = data ?? [];

  return (
    <LocaleProvider locale={locale}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text" role="alert">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className={FILTER_GRID_CLASS}>
            <div className={`${FILTER_WRAP_CLASS} col-span-2 sm:col-span-1`}>
              <Select
                value={filters.category_id || ""}
                onChange={(v) => setFilter("category_id", v)}
                options={[{ value: "", label: FILTER_ALL_CATEGORIES(t) }, ...categories.map(c => ({ value: c.id, label: `${c.icon || "📦"} ${c.name}` }))]}
                placeholder={FILTER_LABEL_CATEGORY(t)}
                ariaLabel={FILTER_LABEL_CATEGORY(t)}
              />
            </div>
            <input
              type="search"
              data-search-input
              defaultValue={filters.q || ""}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder={FILTER_SEARCH_PANTRY(t)}
              className={FILTER_INPUT_CLASS}
            />
            <button onClick={clearFilters} className={FILTER_LIMPIAR_CLASS}>{BTN_CLEAR(t)}</button>
          </div>
          <button data-create="pantry" className={FILTER_CTA_CLASS}>{t.cta.newProduct}</button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          {loading ? (
            <div className="p-4 text-center text-string-muted text-sm">{t.common.loading}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-string-muted text-sm">{t.empty.pantry}</div>
          ) : (
            <table className="w-full text-sm" aria-label={t.page.pantry}>
              <thead>
                <tr className="text-xs uppercase text-string-muted border-b border-border">
                  <th className="text-left px-4 py-3 font-medium">{t.table.item}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.qty}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.category}</th>
                  <th className="text-left px-4 py-3 font-medium">{t.table.notes}</th>
                  <th className="text-right px-4 py-3 font-medium">{t.table.actions}</th>
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
                        <button data-edit-pantry={i.id} className="text-primary hover:text-primary-hover text-xs font-medium cursor-pointer">{BTN_EDIT(t)}</button>
                        <button data-delete-pantry={i.id} className="text-danger hover:text-danger-hover text-xs font-medium cursor-pointer">{BTN_DELETE(t)}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </LocaleProvider>
  );
}

import { useState, useEffect, useCallback } from "react";
import type { PantryItem } from "@/lib/types/pantry.ts";
import type { ShoppingItem } from "@/lib/types/shopping.ts";

interface PantryCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface Props {
  initialTab: string;
  initialItems: string;
  initialPantry: string;
  initialCategories: string;
}

export const SHOPPING_TABS = [
  { key: "list", label: "Lista actual" },
  { key: "history", label: "Historial" },
] as const;

type TabKey = (typeof SHOPPING_TABS)[number]["key"];

export default function ShoppingList({ initialTab, initialItems, initialPantry, initialCategories }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    // Legacy #tab links: the server can't see the hash, so adopt it on the client.
    const h = typeof location !== "undefined" ? location.hash.replace("#", "") : "";
    return SHOPPING_TABS.some(t => t.key === h) ? (h as TabKey) : (initialTab as TabKey);
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeTab !== "list") params.set("tab", activeTab);
    else params.delete("tab");
    const qs = params.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }, [activeTab]);

  // Initial data comes from SSR props; refetch only after mutations.
  const allInitial: ShoppingItem[] = JSON.parse(initialItems);
  const [items, setItems] = useState<ShoppingItem[]>(allInitial.filter(i => !i.is_completed));
  const [historyItems, setHistoryItems] = useState<ShoppingItem[]>(allInitial.filter(i => i.is_completed));
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(JSON.parse(initialPantry));
  const [categories, setCategories] = useState<PantryCategory[]>(JSON.parse(initialCategories));
  const [otroInput, setOtroInput] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, pantryRes, catRes] = await Promise.all([
        fetch("/api/shopping"),
        fetch("/api/pantry"),
        fetch("/api/pantry/categories"),
      ]);
      const itemsJson = await itemsRes.json();
      const pantryJson = await pantryRes.json();
      const catJson = await catRes.json();

      let allItems: ShoppingItem[] = itemsJson.data ?? itemsJson ?? [];
      if (!Array.isArray(allItems)) allItems = [];

      setItems(allItems.filter((i: ShoppingItem) => !i.is_completed));
      setHistoryItems(allItems.filter((i: ShoppingItem) => i.is_completed));
      setPantryItems(pantryJson.data ?? pantryJson ?? []);
      setCategories(catJson.data ?? catJson ?? []);
    } catch {}
  }, []);

  const activeItems = items.filter(i => !i.is_checked);
  const checkedItems = items.filter(i => i.is_checked);

  async function handleToggleCheck(id: string) {
    try {
      const res = await fetch("/api/shopping/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchData();
    } catch {}
  }

  async function handleAddFromDespensa(d: PantryItem) {
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.description,
          quantity: d.quantity,
          category: d.category_id || undefined,
          despensa_item_id: d.id,
        }),
      });
      if (res.ok) fetchData();
    } catch {}
  }

  async function handleAddOtro() {
    const name = otroInput.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity: 1 }),
      });
      if (res.ok) {
        setOtroInput("");
        fetchData();
      }
    } catch {}
  }

  async function handleComplete() {
    try {
      const res = await fetch("/api/shopping/complete", { method: "POST" });
      if (res.ok) fetchData();
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/shopping/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch {}
  }

  const groupedPantry: Record<string, PantryItem[]> = {};
  for (const d of pantryItems) {
    const catName = categories.find(c => c.id === d.category_id)?.name ?? "Otros";
    if (!groupedPantry[catName]) groupedPantry[catName] = [];
    groupedPantry[catName].push(d);
  }

  const sortedCategories = Object.keys(groupedPantry).sort((a, b) => {
    if (a === "Otros") return 1;
    if (b === "Otros") return -1;
    return a.localeCompare(b);
  });

  const historyByMonth: Record<string, ShoppingItem[]> = {};
  for (const h of historyItems) {
    const month = h.completed_at ? h.completed_at.slice(0, 7) : h.updated_at.slice(0, 7);
    if (!historyByMonth[month]) historyByMonth[month] = [];
    historyByMonth[month].push(h);
  }

  function monthLabel(m: string) {
    const d = new Date(m + "-01");
    return d.toLocaleDateString("es", { year: "numeric", month: "long" });
  }

  function selectTab(key: TabKey) {
    setActiveTab(key);
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const idx = SHOPPING_TABS.findIndex(t => t.key === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % SHOPPING_TABS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + SHOPPING_TABS.length) % SHOPPING_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SHOPPING_TABS.length - 1;
    else return;
    e.preventDefault();
    selectTab(SHOPPING_TABS[next].key);
    document.getElementById(`tab-${SHOPPING_TABS[next].key}`)?.focus();
  }

  return (
    <div>
      <div className="flex gap-0 border-b border-border mb-6" role="tablist" aria-label="Secciones de compras">
        {SHOPPING_TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={activeTab === t.key}
            aria-controls={`panel-${t.key}`}
            tabIndex={activeTab === t.key ? 0 : -1}
            onClick={() => selectTab(t.key)}
            onKeyDown={onTabKeyDown}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === t.key ? "text-primary border-primary" : "text-string-muted border-transparent hover:text-string"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "list" && (
        <div className="space-y-4" role="tabpanel" id="panel-list" aria-labelledby="tab-list" tabIndex={0}>
          {Object.keys(groupedPantry).length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-string mb-3">Desde la despensa</h2>
              <div className="flex flex-wrap gap-2">
                {sortedCategories.map(cat => (
                  <div key={cat} className="w-full">
                    <p className="text-xs text-string-muted mb-1 font-medium">{cat}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupedPantry[cat].map(d => {
                        const alreadyInList = items.some(i => i.despensa_item_id === d.id);
                        return (
                          <button
                            key={d.id}
                            onClick={() => handleAddFromDespensa(d)}
                            disabled={alreadyInList}
                            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                              alreadyInList
                                ? "bg-surface-alt text-string-muted cursor-not-allowed"
                                : "bg-primary-bg text-primary-text border border-primary-border"
                            }`}
                          >
                            {d.description}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-string mb-3">Agregar otro</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={otroInput}
                onChange={e => setOtroInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddOtro(); }}
                placeholder="Escribe el nombre del producto..."
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-surface text-string placeholder-text-muted"
              />
              <button
                onClick={handleAddOtro}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover"
              >
                Agregar
              </button>
            </div>
          </div>

          {activeItems.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-string mb-3">Por comprar ({activeItems.length})</h2>
              <div className="space-y-1">
                {activeItems.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-nav-hover group">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={i.is_checked}
                        onChange={() => handleToggleCheck(i.id)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      <span className="text-sm font-medium text-string">{i.name}</span>
                      <span className="text-xs text-string-muted">{i.quantity}{i.unit ? " " + i.unit : ""}</span>
                    </div>
                    <button onClick={() => handleDelete(i.id)} className="text-xs text-danger hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>

                  </div>
                ))}
              </div>
            </div>
          )}

          {checkedItems.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-string">Comprados ({checkedItems.length})</h2>
                <button
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success text-white hover:bg-success-hover"
                >
                  Completar compra
                </button>
              </div>
              <div className="space-y-1">
                {checkedItems.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-nav-hover opacity-60">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={i.is_checked}
                        onChange={() => handleToggleCheck(i.id)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      <span className="text-sm line-through text-string-muted">{i.name}</span>
                      <span className="text-xs text-string-muted">{i.quantity}{i.unit ? " " + i.unit : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeItems.length === 0 && checkedItems.length === 0 && (
            <div className="bg-panel rounded-xl border border-border p-8 shadow-sm text-center">
              <p className="text-string-muted text-sm">Agrega productos desde la despensa o escribe el nombre</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4" role="tabpanel" id="panel-history" aria-labelledby="tab-history" tabIndex={0}>
          {Object.keys(historyByMonth).length === 0 ? (
            <div className="bg-panel rounded-xl border border-border p-8 shadow-sm text-center">
              <p className="text-string-muted text-sm">Sin compras completadas aún</p>
            </div>
          ) : (
            Object.entries(historyByMonth).sort(([a], [b]) => b.localeCompare(a)).map(([month, monthItems]) => (
              <div key={month} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-string mb-3">{monthLabel(month)}</h3>
                <div className="space-y-1">
                  {monthItems.map(i => (
                    <div key={i.id} className="flex items-center justify-between py-1 px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        <span className="text-sm text-string">{i.name}</span>
                        <span className="text-xs text-string-muted">{i.quantity}{i.unit ? " " + i.unit : ""}</span>
                      </div>
                      <span className="text-xs text-string-muted">{i.completed_at ? new Date(i.completed_at).toLocaleDateString("es") : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

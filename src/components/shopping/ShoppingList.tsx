import { useState, useEffect, useCallback } from "react";
import type { PantryItem, PantryCategory } from "@/lib/types/pantry";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  is_checked: boolean;
  is_completed: boolean;
  completed_at: string | null;
  category: string | null;
  pantry_item_id: string | null;
  priority: number;
}

const PANTRY_CATEGORIES: Record<string, string> = {
  Frutas: "#f97316",
  Verduras: "#22c55e",
  Carnes: "#ef4444",
  Lácteos: "#3b82f6",
  Panadería: "#d97706",
  Bebidas: "#06b6d4",
  Limpieza: "#8b5cf6",
  Higiene: "#ec4899",
  Conservas: "#a855f7",
  Congelados: "#0ea5e9",
  Otros: "#6b7280",
};

function formatCurrency(n: number): string {
  return "$" + n.toFixed(2);
}

export default function ShoppingList() {
  const [activeTab, setActiveTab] = useState<"lista" | "historial">("lista");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ShoppingItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [categories, setCategories] = useState<PantryCategory[]>([]);
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

  useEffect(() => { fetchData(); }, [fetchData]);

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

  async function handleAddFromDespensa(d: DespensaItem) {
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.name,
          quantity: d.default_quantity,
          unit: d.unit || undefined,
          category: d.category_id || undefined,
          pantry_item_id: d.id,
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

  const groupedPantry: Record<string, DespensaItem[]> = {};
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab("lista")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "lista" ? "bg-indigo-600 text-white" : "bg-panel text-text-muted hover:text-text hover:bg-nav-hover"
          }`}
        >
          Lista actual
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "historial" ? "bg-indigo-600 text-white" : "bg-panel text-text-muted hover:text-text hover:bg-nav-hover"
          }`}
        >
          Historial
        </button>
      </div>

      {activeTab === "lista" && (
        <div className="space-y-4">
          {Object.keys(groupedPantry).length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-text mb-3">Desde la despensa</h2>
              <div className="flex flex-wrap gap-2">
                {sortedCategories.map(cat => (
                  <div key={cat} className="w-full">
                    <p className="text-xs text-text-muted mb-1 font-medium">{cat}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupedPantry[cat].map(d => {
                        const alreadyInList = items.some(i => i.pantry_item_id === d.id);
                        return (
                          <button
                            key={d.id}
                            onClick={() => handleAddFromDespensa(d)}
                            disabled={alreadyInList}
                            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                              alreadyInList
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                            }`}
                          >
                            {d.name}
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
            <h2 className="text-sm font-semibold text-text mb-3">Agregar otro</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={otroInput}
                onChange={e => setOtroInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddOtro(); }}
                placeholder="Escribe el nombre del producto..."
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-surface text-text placeholder-text-muted"
              />
              <button
                onClick={handleAddOtro}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Agregar
              </button>
            </div>
          </div>

          {activeItems.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-text mb-3">Por comprar ({activeItems.length})</h2>
              <div className="space-y-1">
                {activeItems.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-nav-hover group">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={i.is_checked}
                        onChange={() => handleToggleCheck(i.id)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-text">{i.name}</span>
                      <span className="text-xs text-text-muted">{i.quantity}{i.unit ? " " + i.unit : ""}</span>
                    </div>
                    <button onClick={() => handleDelete(i.id)} className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checkedItems.length > 0 && (
            <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text">Comprados ({checkedItems.length})</h2>
                <button
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
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
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-sm line-through text-text-muted">{i.name}</span>
                      <span className="text-xs text-text-muted">{i.quantity}{i.unit ? " " + i.unit : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeItems.length === 0 && checkedItems.length === 0 && (
            <div className="bg-panel rounded-xl border border-border p-8 shadow-sm text-center">
              <p className="text-text-muted text-sm">Agrega productos desde la despensa o escribe el nombre</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "historial" && (
        <div className="space-y-4">
          {Object.keys(historyByMonth).length === 0 ? (
            <div className="bg-panel rounded-xl border border-border p-8 shadow-sm text-center">
              <p className="text-text-muted text-sm">Sin compras completadas aún</p>
            </div>
          ) : (
            Object.entries(historyByMonth).sort(([a], [b]) => b.localeCompare(a)).map(([month, monthItems]) => (
              <div key={month} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-text mb-3">{monthLabel(month)}</h3>
                <div className="space-y-1">
                  {monthItems.map(i => (
                    <div key={i.id} className="flex items-center justify-between py-1 px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-sm text-text">{i.name}</span>
                        <span className="text-xs text-text-muted">{i.quantity}{i.unit ? " " + i.unit : ""}</span>
                      </div>
                      <span className="text-xs text-text-muted">{i.completed_at ? new Date(i.completed_at).toLocaleDateString("es") : ""}</span>
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

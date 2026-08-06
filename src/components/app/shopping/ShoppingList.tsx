import { useState, useEffect, useCallback } from "react";
import Select from "@/components/ui/Select.tsx";
import type { PantryItem } from "@/lib/types/pantry.ts";
import type { ShoppingItem, ShoppingList } from "@/lib/types/shopping.ts";
import { formatDate, formatDateTime } from "@/lib/date.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";
import type { Locale } from "@/lib/i18n/es.ts";

interface PantryCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface Props {
  initialTab: string;
  initialItems: string;
  initialLists: string;
  initialPantry: string;
  initialCategories: string;
  locale?: LocaleCode;
}

export function SHOPPING_TABS(t: Locale) {
  return [
    { key: "list", label: t.tabs.currentList },
    { key: "history", label: t.tabs.history },
  ] as const;
}

type TabKey = (typeof SHOPPING_TABS extends (t: Locale) => infer T ? T : never)[number]["key"];

function listTitle(list: ShoppingList, locale: LocaleCode): string {
  return list.name || formatDateTime(list.created_at, locale);
}

export default function ShoppingList({ initialTab, initialItems, initialLists, initialPantry, initialCategories, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const tabs = SHOPPING_TABS(t);
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    // Legacy #tab links: the server can't see the hash, so adopt it on the client.
    const h = typeof location !== "undefined" ? location.hash.replace("#", "") : "";
    const tabKeys = SHOPPING_TABS(t).map(tt => tt.key);
    return tabKeys.includes(h) ? (h as TabKey) : (initialTab as TabKey);
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeTab !== "list") params.set("tab", activeTab);
    else params.delete("tab");
    const qs = params.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }, [activeTab]);

  // Initial data comes from SSR props; refetch only after mutations.
  const [lists, setLists] = useState<ShoppingList[]>(JSON.parse(initialLists));
  const [items, setItems] = useState<ShoppingItem[]>(JSON.parse(initialItems));
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(JSON.parse(initialPantry));
  const [categories, setCategories] = useState<PantryCategory[]>(JSON.parse(initialCategories));
  const [otroInputs, setOtroInputs] = useState<Record<string, string>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [targetListId, setTargetListId] = useState("");
  const [confirmDeleteListId, setConfirmDeleteListId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [listsRes, itemsRes, pantryRes, catRes] = await Promise.all([
        fetch("/api/shopping/lists"),
        fetch("/api/shopping"),
        fetch("/api/pantry"),
        fetch("/api/pantry/categories"),
      ]);
      const listsJson = await listsRes.json();
      const itemsJson = await itemsRes.json();
      const pantryJson = await pantryRes.json();
      const catJson = await catRes.json();
      setLists(listsJson.data ?? listsJson ?? []);
      setItems(itemsJson.data ?? itemsJson ?? []);
      setPantryItems(pantryJson.data ?? pantryJson ?? []);
      setCategories(catJson.data ?? catJson ?? []);
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }, [t]);

  const activeLists = lists.filter(l => !l.is_completed);
  const completedLists = lists.filter(l => l.is_completed);
  const effectiveTarget =
    activeLists.some(l => l.id === targetListId) ? targetListId : (activeLists[0]?.id ?? "");

  async function handleNewList() {
    const name = new Date().toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
    try {
      const res = await fetch("/api/shopping/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setOtroInputs({});
        setConfirmDeleteListId(null);
        fetchData();
      } else {
        setError(t.error.message(t.common.errorUnknown));
      }
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }

  function commitRename(listId: string) {
    const draft = (nameDrafts[listId] ?? "").trim();
    if (nameDrafts[listId] === undefined) return;
    const current = lists.find(l => l.id === listId)?.name ?? "";
    setNameDrafts(d => {
      const next = { ...d };
      delete next[listId];
      return next;
    });
    if (draft !== current) {
      fetch(`/api/shopping/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft }),
      })
        .then(r => {
          if (r.ok) fetchData();
          else setError(t.error.message(t.common.errorUnknown));
        })
        .catch(() => {
          setError(t.error.message(t.common.errorUnknown));
        });
    }
  }

  async function handleDeleteList(listId: string) {
    try {
      const res = await fetch(`/api/shopping/lists/${listId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteListId(null);
        fetchData();
      } else {
        setError(t.error.message(t.common.errorUnknown));
      }
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }

  async function handleCompleteList(listId: string) {
    try {
      const res = await fetch(`/api/shopping/lists/${listId}/complete`, { method: "POST" });
      if (res.ok) fetchData();
      else setError(t.error.message(t.common.errorUnknown));
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }

  async function handleToggleCheck(id: string) {
    try {
      const res = await fetch("/api/shopping/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchData();
      else setError(t.error.message(t.common.errorUnknown));
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }

  async function handleAddFromDespensa(d: PantryItem) {
    if (!effectiveTarget) return;
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.description,
          quantity: d.quantity,
          category: d.category_id || undefined,
          despensa_item_id: d.id,
          list_id: effectiveTarget,
        }),
      });
      if (res.ok) fetchData();
      else setError(t.error.message(t.common.errorUnknown));
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }

  async function handleAddOtro(listId: string) {
    const name = (otroInputs[listId] ?? "").trim();
    if (!name) return;
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity: 1, list_id: listId }),
      });
      if (res.ok) {
        setOtroInputs(d => ({ ...d, [listId]: "" }));
        fetchData();
      } else {
        setError(t.error.message(t.common.errorUnknown));
      }
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }

  async function handleDeleteItem(id: string) {
    try {
      const res = await fetch(`/api/shopping/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else setError(t.error.message(t.common.errorUnknown));
    } catch {
      setError(t.error.message(t.common.errorUnknown));
    }
  }

  const groupedPantry: Record<string, PantryItem[]> = {};
  for (const d of pantryItems) {
    const catName = categories.find(c => c.id === d.category_id)?.name ?? t.shopping.others;
    if (!groupedPantry[catName]) groupedPantry[catName] = [];
    groupedPantry[catName].push(d);
  }

  const sortedCategories = Object.keys(groupedPantry).sort((a, b) => {
    if (a === t.shopping.others) return 1;
    if (b === t.shopping.others) return -1;
    return a.localeCompare(b);
  });

  const historyByMonth: Record<string, ShoppingList[]> = {};
  for (const l of completedLists) {
    const month = (l.completed_at ?? l.updated_at).slice(0, 7);
    if (!historyByMonth[month]) historyByMonth[month] = [];
    historyByMonth[month].push(l);
  }

  function monthLabel(m: string) {
    return new Date(Number(m.slice(0,4)), Number(m.slice(5,7)) - 1, 1).toLocaleDateString(locale, { year: "numeric", month: "long" });
  }

  function selectTab(key: TabKey) {
    setActiveTab(key);
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const idx = tabs.findIndex(tt => tt.key === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    selectTab(tabs[next].key);
    document.getElementById(`tab-${tabs[next].key}`)?.focus();
  }

  return (
    <LocaleProvider locale={locale}>
      <div>
        {error && (
          <div className="mb-4 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text" role="alert">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 font-medium hover:underline"
              aria-label={t.common.dismiss}
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex md:hidden items-center gap-2 mb-4">
          <div className="flex-1">
            <Select
              value={activeTab}
              onChange={(v) => selectTab(v as TabKey)}
              options={tabs.map(tt => ({ value: tt.key, label: tt.label }))}
              ariaLabel={t.shopping.ariaSections}
            />
          </div>
        </div>
        <div className="hidden md:flex gap-0 border-b border-border mb-6" role="tablist" aria-label={t.shopping.ariaSections}>
          {tabs.map(tt => (
            <button
              key={tt.key}
              role="tab"
              id={`tab-${tt.key}`}
              aria-selected={activeTab === tt.key}
              aria-controls={`panel-${tt.key}`}
              tabIndex={activeTab === tt.key ? 0 : -1}
              onClick={() => selectTab(tt.key)}
              onKeyDown={onTabKeyDown}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
                activeTab === tt.key ? "text-primary border-primary" : "text-string-muted border-transparent hover:text-string"
              }`}
            >
              {tt.label}
            </button>
          ))}
        </div>

        {activeTab === "list" && (
          <div className="space-y-4" role="tabpanel" id="panel-list" aria-labelledby="tab-list" tabIndex={0}>
            <div className="flex items-center justify-end">
              <button
                onClick={handleNewList}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover"
              >
                {t.shopping.newList}
              </button>
            </div>

            {Object.keys(groupedPantry).length > 0 && (
              <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h2 className="text-sm font-semibold text-string">{t.shopping.fromPantry}</h2>
                  {activeLists.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-string-muted">{t.shopping.addTo}</span>
                      <Select
                        value={effectiveTarget}
                        onChange={v => setTargetListId(v)}
                        options={activeLists.map(l => ({ value: l.id, label: listTitle(l, locale) }))}
                        ariaLabel={t.shopping.addTo}
                        fitWidest
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedCategories.map(cat => (
                    <div key={cat} className="w-full">
                      <p className="text-xs text-string-muted mb-1 font-medium">{cat}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {groupedPantry[cat].map(d => {
                          const alreadyInList = items.some(i => i.despensa_item_id === d.id && i.list_id === effectiveTarget);
                          return (
                            <button
                              key={d.id}
                              onClick={() => handleAddFromDespensa(d)}
                              disabled={alreadyInList || !effectiveTarget}
                              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                                alreadyInList || !effectiveTarget
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

            {activeLists.length === 0 && (
              <div className="bg-panel rounded-xl border border-border p-8 shadow-sm text-center">
                <p className="text-string-muted text-sm">{t.shopping.emptyLists}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {activeLists.map(list => {
              const listItems = items.filter(i => i.list_id === list.id);
              const activeItems = listItems.filter(i => !i.is_checked);
              const checkedItems = listItems.filter(i => i.is_checked);
              const title = nameDrafts[list.id] ?? listTitle(list, locale);
              return (
                <div key={list.id} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <input
                      type="text"
                      value={title}
                      onChange={e => setNameDrafts(d => ({ ...d, [list.id]: e.target.value }))}
                      onBlur={() => commitRename(list.id)}
                      onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      placeholder={t.shopping.listNamePlaceholder}
                      aria-label={t.shopping.listNamePlaceholder}
                      className="flex-1 min-w-0 text-sm font-semibold text-string bg-transparent border border-transparent hover:border-border focus:border-border focus:bg-surface rounded px-2 py-1 focus:outline-none"
                    />
                    <span className="text-xs text-string-muted whitespace-nowrap">{t.shopping.itemCount(listItems.length)}</span>
                    <button
                      onClick={() => handleCompleteList(list.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success text-white hover:bg-success-hover"
                    >
                      {t.shopping.finalizeList}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteListId(confirmDeleteListId === list.id ? null : list.id)}
                      className="text-xs text-danger hover:text-danger-hover cursor-pointer"
                    >
                      {t.shopping.deleteList}
                    </button>
                  </div>

                  {confirmDeleteListId === list.id && (
                    <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-lg bg-danger-bg border border-danger-border">
                      <span className="text-xs text-danger-text">{t.shopping.confirmDeleteList}</span>
                      <div className="flex gap-3 shrink-0">
                        <button onClick={() => handleDeleteList(list.id)} className="text-xs font-medium text-danger hover:text-danger-hover cursor-pointer">
                          {t.common.delete}
                        </button>
                        <button onClick={() => setConfirmDeleteListId(null)} className="text-xs text-string-muted hover:text-string cursor-pointer">
                          {t.common.cancel}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeItems.length > 0 && (
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
                          <button onClick={() => handleDeleteItem(i.id)} className="text-xs text-danger hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">{t.common.delete}</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {checkedItems.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {checkedItems.map(i => (
                        <div key={i.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg opacity-60">
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
                  )}

                  <div className="flex gap-2 mt-2 pt-2 border-t border-border/60">
                    <input
                      type="text"
                      value={otroInputs[list.id] ?? ""}
                      onChange={e => setOtroInputs(d => ({ ...d, [list.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleAddOtro(list.id); }}
                      placeholder={t.shopping.searchPlaceholder}
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-surface text-string placeholder-text-muted"
                    />
                    <button
                      onClick={() => handleAddOtro(list.id)}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover"
                    >
                      {t.common.add}
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4" role="tabpanel" id="panel-history" aria-labelledby="tab-history" tabIndex={0}>
            {Object.keys(historyByMonth).length === 0 ? (
              <div className="bg-panel rounded-xl border border-border p-8 shadow-sm text-center">
                <p className="text-string-muted text-sm">{t.empty.shoppingHistory}</p>
              </div>
            ) : (
              Object.entries(historyByMonth).sort(([a], [b]) => b.localeCompare(a)).map(([month, monthLists]) => (
                <div key={month} className="bg-panel rounded-xl border border-border p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-string mb-3">{monthLabel(month)}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {monthLists.map(list => {
                      const listItems = items.filter(i => i.list_id === list.id);
                      return (
                        <div key={list.id} className="rounded-lg border border-border/60 p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-string">{listTitle(list, locale)}</h4>
                            <span className="text-xs text-string-muted">
                              {t.shopping.completedOn} {list.completed_at ? formatDate(list.completed_at, locale) : ""}
                            </span>
                          </div>
                          {listItems.length === 0 ? (
                            <p className="text-xs text-string-muted">{t.empty.shoppingHistory}</p>
                          ) : (
                            <div className="space-y-1">
                              {listItems.map(i => (
                                <div key={i.id} className="flex items-center justify-between py-1 px-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                    <span className="text-sm text-string">{i.name}</span>
                                    <span className="text-xs text-string-muted">{i.quantity}{i.unit ? " " + i.unit : ""}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </LocaleProvider>
  );
}

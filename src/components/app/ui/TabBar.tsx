import { useState, useRef, useEffect, useCallback } from "react";
import Select from "@/components/ui/Select.tsx";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  initialTab: string;
  defaultTab: string;
  ariaLabel: string;
  /** The second argument is true when restoring the tab from browser history. */
  onChange?: (key: string, restored?: boolean) => void;
  /** Optional MonthSelector to show alongside tabs */
  monthSelector?: React.ReactNode;
  locale?: LocaleCode;
}

export default function TabBar({ tabs, initialTab, defaultTab, ariaLabel, onChange, monthSelector, locale = "es" }: TabBarProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectTab = useCallback((key: string) => {
    setActiveTab(key);
    const container = containerRef.current?.closest(".tabs-container");
    container?.querySelectorAll<HTMLElement>("[data-tab-content]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.tabContent !== key);
    });
  }, []);

  useEffect(() => {
    function restoreTab() {
      const param = new URLSearchParams(location.search).get("tab");
      const key = tabs.find(tab => tab.key === param)?.key ?? defaultTab;
      selectTab(key);
      onChange?.(key, true);
    }
    window.addEventListener("popstate", restoreTab);
    return () => window.removeEventListener("popstate", restoreTab);
  }, [tabs, defaultTab, onChange, selectTab]);

  function activate(key: string) {
    selectTab(key);
    const url = new URL(location.href);
    if (key !== defaultTab) url.searchParams.set("tab", key);
    else url.searchParams.delete("tab");
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
    onChange?.(key);
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const idx = tabs.findIndex(t => t.key === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    activate(tabs[next].key);
    document.getElementById(`tab-${tabs[next].key}`)?.focus();
  }

  return (
    <LocaleProvider locale={locale}>
      <div ref={containerRef}>
        <div className="flex md:hidden items-center gap-2 mb-4">
          <div className="flex-1">
            <Select
              value={activeTab}
              onChange={activate}
              options={tabs.map(t => ({ value: t.key, label: t.label }))}
              ariaLabel={ariaLabel}
            />
          </div>
          {monthSelector && <div className="shrink-0">{monthSelector}</div>}
        </div>
        <div className={`hidden md:flex items-end justify-between gap-2 border-b border-border ${monthSelector ? "pb-0" : ""}`}>
          <div className="flex gap-0" role="tablist" aria-label={ariaLabel}>
            {tabs.map(t => (
              <button
                key={t.key}
                data-tab={t.key}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={activeTab === t.key}
                aria-controls={`panel-${t.key}`}
                tabIndex={activeTab === t.key ? 0 : -1}
                onClick={() => activate(t.key)}
                onKeyDown={onTabKeyDown}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${
                  activeTab === t.key
                    ? "text-primary border-primary -mb-px"
                    : "text-string-muted hover:text-string border-transparent -mb-px"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {monthSelector && <div className="shrink-0 pb-2">{monthSelector}</div>}
        </div>
      </div>
    </LocaleProvider>
  );
}

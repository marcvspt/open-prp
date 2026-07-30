import { useState, useRef } from "react";
import Select from "@/components/ui/Select.tsx";

interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  initialTab: string;
  defaultTab: string;
  ariaLabel: string;
  /** Called when the active tab changes, in addition to DOM/URL management */
  onChange?: (key: string) => void;
  /** Optional MonthSelector to show alongside tabs */
  monthSelector?: React.ReactNode;
}

export default function TabBar({ tabs, initialTab, defaultTab, ariaLabel, onChange, monthSelector }: TabBarProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const containerRef = useRef<HTMLDivElement>(null);

  function activate(key: string) {
    setActiveTab(key);
    if (onChange) onChange(key);
    const container = containerRef.current?.closest(".tabs-container");
    if (!container) return;
    const buttons = [...container.querySelectorAll<HTMLElement>("[data-tab]")];
    const contents = container.querySelectorAll<HTMLElement>("[data-tab-content]");
    buttons.forEach((btn) => {
      const isActive = btn.dataset.tab === key;
      btn.classList.toggle("text-primary", isActive);
      btn.classList.toggle("border-primary", isActive);
      btn.classList.toggle("text-string-muted", !isActive);
      btn.classList.toggle("border-transparent", !isActive);
      btn.setAttribute("aria-selected", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    });
    contents.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.tabContent !== key);
    });
    const params = new URLSearchParams(location.search);
    if (key !== defaultTab) params.set("tab", key);
    else params.delete("tab");
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
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
  );
}

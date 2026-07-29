const ACTIVE_CLASSES = ["text-primary", "border-primary"] as const;
const INACTIVE_CLASSES = ["text-string-muted", "border-transparent"] as const;

interface TabsOptions {
  /** Tab activated on init (already resolved from ?tab= or a legacy #hash). */
  initialTab: string;
  /** Default tab: the one that leaves no ?tab= param in the URL. */
  defaultTab: string;
}

/**
 * Generic accessible tab switcher (APG tabs pattern). Expects a container with
 * `[data-tab]` buttons (role="tab") and `[data-tab-content]` panels (role="tabpanel").
 * Manages aria-selected + roving tabIndex, arrow keys/Home/End navigation,
 * and syncs the active tab with the ?tab= query param (SSR-visible, unlike #hash).
 */
export function initTabs(container: HTMLElement, { initialTab, defaultTab }: TabsOptions): void {
  const buttons = [...container.querySelectorAll<HTMLElement>("[data-tab]")];
  const contents = container.querySelectorAll<HTMLElement>("[data-tab-content]");
  if (buttons.length === 0) return;

  function activate(tabId: string, focus = false): void {
    buttons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle(ACTIVE_CLASSES[0], isActive);
      btn.classList.toggle(ACTIVE_CLASSES[1], isActive);
      btn.classList.toggle(INACTIVE_CLASSES[0], !isActive);
      btn.classList.toggle(INACTIVE_CLASSES[1], !isActive);
      btn.setAttribute("aria-selected", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
      if (isActive && focus) btn.focus();
    });
    contents.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.tabContent !== tabId);
    });
    const params = new URLSearchParams(location.search);
    if (tabId !== defaultTab) params.set("tab", tabId);
    else params.delete("tab");
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  buttons.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab) activate(btn.dataset.tab);
    });
    btn.addEventListener("keydown", (e) => {
      let next = -1;
      if (e.key === "ArrowRight") next = (idx + 1) % buttons.length;
      else if (e.key === "ArrowLeft") next = (idx - 1 + buttons.length) % buttons.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = buttons.length - 1;
      else return;
      e.preventDefault();
      const target = buttons[next];
      if (target.dataset.tab) activate(target.dataset.tab, true);
    });
  });

  activate(buttons.some(b => b.dataset.tab === initialTab) ? initialTab : defaultTab);
}

const ACTIVE_CLASSES = ["text-primary", "border-primary"] as const;
const INACTIVE_CLASSES = ["text-string-muted", "border-transparent"] as const;

/**
 * Generic tab switcher. Expects a container with `[data-tab]` buttons and
 * `[data-tab-content]` panels. Syncs the active tab with the URL hash.
 */
export function initTabs(container: HTMLElement, defaultTab: string): void {
  const buttons = container.querySelectorAll<HTMLElement>("[data-tab]");
  const contents = container.querySelectorAll<HTMLElement>("[data-tab-content]");
  if (buttons.length === 0) return;

  function activate(tabId: string): void {
    buttons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle(ACTIVE_CLASSES[0], isActive);
      btn.classList.toggle(ACTIVE_CLASSES[1], isActive);
      btn.classList.toggle(INACTIVE_CLASSES[0], !isActive);
      btn.classList.toggle(INACTIVE_CLASSES[1], !isActive);
    });
    contents.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.tabContent !== tabId);
    });
    history.replaceState(null, "", `${location.pathname}#${tabId}${location.search}`);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab) activate(btn.dataset.tab);
    });
  });

  activate(location.hash.replace("#", "") || defaultTab);
}

const ACTIVE_CLASSES = ["text-primary", "border-primary"] as const;
const INACTIVE_CLASSES = ["text-string-muted", "border-transparent"] as const;

/**
 * Generic accessible tab switcher (APG tabs pattern). Expects a container with
 * `[data-tab]` buttons (role="tab") and `[data-tab-content]` panels (role="tabpanel").
 * Manages aria-selected + roving tabIndex, arrow keys/Home/End navigation,
 * and syncs the active tab with the URL hash.
 */
export function initTabs(container: HTMLElement, defaultTab: string): void {
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
    history.replaceState(null, "", `${location.pathname}#${tabId}${location.search}`);
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

  const hashTab = location.hash.replace("#", "");
  activate(buttons.some(b => b.dataset.tab === hashTab) ? hashTab : defaultTab);
}

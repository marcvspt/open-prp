let sidebarEvents: AbortController | undefined;

export function initSidebar(): void {
  sidebarEvents?.abort();
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const closeBtn = document.getElementById("sidebar-close");
  const main = document.getElementById("main-content");
  if (!sidebar || !overlay || !toggleBtn || !closeBtn || !main) return;

  sidebarEvents = new AbortController();
  const { signal } = sidebarEvents;
  const desktop = matchMedia("(min-width: 64rem)");
  let open = false;

  function setOpen(next: boolean, restoreFocus = true) {
    if (!sidebar || !overlay || !toggleBtn || !closeBtn || !main) return;
    open = next && !desktop.matches;
    if (open) {
      sidebar.setAttribute("role", "dialog");
      sidebar.setAttribute("aria-modal", "true");
    } else {
      sidebar.removeAttribute("role");
      sidebar.removeAttribute("aria-modal");
    }
    sidebar.inert = !open && !desktop.matches;
    sidebar.classList.toggle("invisible", !open);
    sidebar.classList.toggle("-translate-x-full", !open);
    overlay.classList.toggle("hidden", !open);
    toggleBtn.classList.toggle("invisible", open);
    toggleBtn.setAttribute("aria-expanded", String(open));
    main.inert = open;
    if (open) closeBtn.focus();
    else if (restoreFocus && !desktop.matches) toggleBtn.focus();
  }

  setOpen(false, false);
  toggleBtn.addEventListener("click", () => setOpen(true), { signal });
  closeBtn.addEventListener("click", () => setOpen(false), { signal });
  overlay.addEventListener("click", () => setOpen(false), { signal });
  desktop.addEventListener("change", () => setOpen(false, sidebar.contains(document.activeElement)), { signal });
  sidebar.querySelectorAll("nav a").forEach(link => link.addEventListener("click", () => {
    if (open) setOpen(false);
  }, { signal }));

  sidebar.addEventListener("keydown", event => {
    if (!open || event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      const focusable = [...sidebar.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), [tabindex]")]
        .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible");
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault();
        first.focus();
      }
    }
  }, { signal });
}

/** Forwards clicks on the whole "Mi cuenta" row to the Clerk UserButton inside it. */
export function initUserAreaForward(): void {
  document.addEventListener("click", (e) => {
    const area = (e.target as HTMLElement).closest("[data-user-area]");
    if (!area) return;
    const btn = area.querySelector("button");
    if (btn && btn !== e.target && !btn.contains(e.target as Node)) {
      btn.click();
    }
  });
}

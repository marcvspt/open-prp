/** Mobile sidebar drawer: hamburger toggle, overlay backdrop, close on nav link click. */
export function initSidebar(): void {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleBtn = document.getElementById("sidebar-toggle");
  if (!sidebar || !overlay || !toggleBtn) return;

  const open = () => {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    toggleBtn.classList.add("opacity-0", "pointer-events-none");
  };
  const close = () => {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    toggleBtn.classList.remove("opacity-0", "pointer-events-none");
  };

  toggleBtn.addEventListener("click", open);
  overlay.addEventListener("click", close);
  sidebar.querySelectorAll("nav a").forEach((link) => link.addEventListener("click", close));
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

const initialized = new WeakSet<HTMLElement>();

function positionPopover(popover: HTMLElement, trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const margin = 16;
  const viewportHeight = window.innerHeight;
  const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
  const top = rect.bottom + 8 + height <= viewportHeight - margin
    ? rect.bottom + 8
    : Math.max(margin, rect.top - height - 8);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

export function initSupportPopovers() {
  for (const popover of document.querySelectorAll<HTMLElement>("[data-support-popover]")) {
    if (initialized.has(popover)) continue;
    const trigger = document.querySelector<HTMLElement>(`[data-support-trigger][popovertarget="${popover.id}"]`);
    if (!trigger) continue;
    initialized.add(popover);
    popover.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest("a")) popover.hidePopover();
    });
    popover.addEventListener("toggle", () => {
      const open = popover.matches(":popover-open");
      trigger.setAttribute("aria-expanded", String(open));
      if (open) positionPopover(popover, trigger);
    });
  }
}

function repositionOpenPopovers() {
  for (const popover of document.querySelectorAll<HTMLElement>("[data-support-popover]:popover-open")) {
    const trigger = document.querySelector<HTMLElement>(`[data-support-trigger][popovertarget="${popover.id}"]`);
    if (trigger && trigger.getClientRects().length) positionPopover(popover, trigger);
    else popover.hidePopover();
  }
}

window.addEventListener("resize", repositionOpenPopovers);
window.addEventListener("scroll", repositionOpenPopovers, true);
document.addEventListener("astro:before-swap", () => {
  for (const popover of document.querySelectorAll<HTMLElement>("[data-support-popover]:popover-open")) {
    popover.hidePopover();
  }
});

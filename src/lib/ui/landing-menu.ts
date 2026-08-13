/** Landing mobile hamburger menu: toggle dropdown, swap icons, lock body scroll. */
export function initLandingMenu(): void {
  const btn = document.getElementById("mobile-menu-btn");
  const dropdown = document.getElementById("mobile-dropdown");
  const hamburger = document.getElementById("hamburger-icon");
  const closeIcon = document.getElementById("close-icon");
  if (!btn || !dropdown || !hamburger || !closeIcon) return;

  const open = () => {
    btn.setAttribute("aria-expanded", "true");
    dropdown.classList.add("open");
    hamburger.classList.add("hidden");
    closeIcon.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    btn.setAttribute("aria-expanded", "false");
    dropdown.classList.remove("open");
    hamburger.classList.remove("hidden");
    closeIcon.classList.add("hidden");
    document.body.style.overflow = "";
  };

  btn.addEventListener("click", () => {
    btn.getAttribute("aria-expanded") === "true" ? close() : open();
  });
  dropdown.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}
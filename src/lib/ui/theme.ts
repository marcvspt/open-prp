export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(pref: Theme): ResolvedTheme {
  return pref === "system" ? getSystemTheme() : pref;
}

export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function getSavedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable
  }
  return "system";
}

export function saveTheme(pref: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // localStorage unavailable
  }
}

/** Applies the saved theme and keeps it in sync with the OS when set to "system". Returns a cleanup function. */
export function initThemeSync(): () => void {
  applyTheme(resolveTheme(getSavedTheme()));
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getSavedTheme() === "system") applyTheme(getSystemTheme());
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

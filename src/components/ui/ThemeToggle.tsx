import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(pref: Theme): "light" | "dark" {
  if (pref === "system") return getSystemTheme();
  return pref;
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function getSaved(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

function saveTheme(pref: Theme) {
  try { localStorage.setItem("theme", pref); } catch {}
}

const options = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

const icons: Record<Theme, string> = {
  light: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  dark: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  system: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
};

export default function ThemeToggle() {
  const [preference, setPreference] = useState<Theme>("system");

  useEffect(() => {
    const saved = getSaved();
    setPreference(saved);
    applyTheme(resolveTheme(saved));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getSaved() === "system") applyTheme(getSystemTheme());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleChange(value: string) {
    const pref = value as Theme;
    setPreference(pref);
    saveTheme(pref);
    applyTheme(resolveTheme(pref));
  }

  return (
    <div className="px-3 py-2">
      <Select
        value={preference}
        onChange={handleChange}
        options={options}
        className="w-full"
        icon={<svg className="w-4 h-4 text-nav" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[preference]} />
        </svg>}
      />
    </div>
  );
}

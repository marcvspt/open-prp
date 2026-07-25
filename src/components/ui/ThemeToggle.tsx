import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";
import SunIcon from "@/assets/SunIcon.svg?react";
import MoonIcon from "@/assets/MoonIcon.svg?react";
import MonitorIcon from "@/assets/MonitorIcon.svg?react";

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
        icon={preference === "light" ? <SunIcon className="w-4 h-4 text-nav" /> : preference === "dark" ? <MoonIcon className="w-4 h-4 text-nav" /> : <MonitorIcon className="w-4 h-4 text-nav" />}
      />
    </div>
  );
}

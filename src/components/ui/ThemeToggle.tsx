import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";
import SunIcon from "@/assets/sun.svg?react";
import MoonIcon from "@/assets/moon.svg?react";
import MonitorIcon from "@/assets/monitor.svg?react";
import { getSavedTheme, saveTheme, applyTheme, resolveTheme, initThemeSync, type Theme } from "@/lib/ui/theme.ts";

const options = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

export default function ThemeToggle() {
  const [preference, setPreference] = useState<Theme>("system");

  useEffect(() => {
    setPreference(getSavedTheme());
    return initThemeSync();
  }, []);

  function handleChange(value: string) {
    const pref = value as Theme;
    setPreference(pref);
    saveTheme(pref);
    applyTheme(resolveTheme(pref));
  }

  return (
    <Select
      value={preference}
      onChange={handleChange}
      options={options}
      className="w-full"
      icon={preference === "light" ? <SunIcon className="w-4 h-4 text-nav" /> : preference === "dark" ? <MoonIcon className="w-4 h-4 text-nav" /> : <MonitorIcon className="w-4 h-4 text-nav" />}
    />
  );
}

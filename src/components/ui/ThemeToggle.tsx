import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";
import SunIcon from "@/assets/sun.svg?react";
import MoonIcon from "@/assets/moon.svg?react";
import MonitorIcon from "@/assets/monitor.svg?react";
import { getSavedTheme, saveTheme, applyTheme, resolveTheme, initThemeSync, type Theme } from "@/lib/ui/theme.ts";

const options = [
  { value: "light", label: "Claro", icon: <SunIcon className="w-4 h-4" /> },
  { value: "dark", label: "Oscuro", icon: <MoonIcon className="w-4 h-4" /> },
  { value: "system", label: "Sistema", icon: <MonitorIcon className="w-4 h-4" /> },
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
    />
  );
}

import { useState, useEffect } from "react";
import Select from "@/components/ui/Select.tsx";
import SunIcon from "@/assets/sun.svg?react";
import MoonIcon from "@/assets/moon.svg?react";
import MonitorIcon from "@/assets/monitor.svg?react";
import { getSavedTheme, saveTheme, applyTheme, resolveTheme, initThemeSync, type Theme } from "@/lib/ui/theme.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

export default function ThemeToggle({ locale = "es" }: { locale?: LocaleCode }) {
  const t = getLocaleDict(locale);
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

  const options = [
    { value: "light", label: t.theme.light, icon: <SunIcon className="w-4 h-4" /> },
    { value: "dark", label: t.theme.dark, icon: <MoonIcon className="w-4 h-4" /> },
    { value: "system", label: t.theme.system, icon: <MonitorIcon className="w-4 h-4" /> },
  ];

  return (
    <LocaleProvider locale={locale}>
      <Select
        value={preference}
        onChange={handleChange}
        options={options}
        className="w-full"
        fitWidest
        ariaLabel={t.theme.label}
      />
    </LocaleProvider>
  );
}

import Select from "@/components/ui/Select.tsx";
import { LOCALES } from "@/lib/i18n/locale.ts";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface LocaleSwitcherProps {
  locale?: LocaleCode;
  className?: string;
}

export default function LocaleSwitcher({ locale = "es", className = "w-full" }: LocaleSwitcherProps) {
  const t = getLocaleDict(locale);

  const handleChange = (value: string) => {
    const pathname = window.location.pathname;
    let basePath = pathname;
    for (const code of LOCALES) {
      const prefix = `/${code}`;
      if (pathname === prefix) {
        basePath = "/";
        break;
      }
      if (pathname.startsWith(`${prefix}/`)) {
        basePath = pathname.slice(prefix.length);
        break;
      }
    }
    const suffix = basePath === "/" ? "" : basePath;
    window.location.href = `/${value}${suffix}${window.location.search}`;
  };

  const options = LOCALES.map((code) => ({ value: code, label: t.language[code] }));

  return (
    <LocaleProvider locale={locale}>
      <Select
        value={locale}
        onChange={handleChange}
        options={options}
        className={className}
        ariaLabel={t.language.label}
      />
    </LocaleProvider>
  );
}

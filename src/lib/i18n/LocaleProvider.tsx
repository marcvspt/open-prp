import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";
import { es } from "@/lib/i18n/es.ts";
import type { Locale } from "@/lib/i18n/es.ts";

export const LocaleContext = createContext<Locale>(es);

export function LocaleProvider({ locale, children }: { locale: LocaleCode; children: ReactNode }) {
  return <LocaleContext.Provider value={getLocaleDict(locale)}>{children}</LocaleContext.Provider>;
}

export function useLocaleDict(): Locale {
  return useContext(LocaleContext);
}

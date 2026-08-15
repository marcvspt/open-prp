import { es } from "@/lib/i18n/es.ts";
import { en } from "@/lib/i18n/en.ts";
import type { Locale } from "@/lib/i18n/es.ts";

export type LocaleCode = "es" | "en";

export const DEFAULT_LOCALE: LocaleCode = "es";

export const LOCALES: LocaleCode[] = ["es", "en"];

export function isLocaleCode(value: string | undefined | null): value is LocaleCode {
  return value === "es" || value === "en";
}

/** Normalizes any input (e.g. `Astro.currentLocale`) to a valid `LocaleCode`, falling back to the default locale. */
export function resolveLocale(locale: string | undefined | null): LocaleCode {
  return isLocaleCode(locale) ? locale : DEFAULT_LOCALE;
}

export function getLocaleDict(locale: string | undefined | null): Locale {
  return locale === "en" ? en : es;
}

import type { LocaleCode } from "@/lib/i18n/locale.ts";

export type FilterState = Record<string, string>;

export interface FilterOptions {
  keys: readonly string[];
  locale: LocaleCode;
  defaults?: FilterState;
  createdAt?: string;
}

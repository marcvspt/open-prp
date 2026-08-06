import type { Locale } from "@/lib/i18n/es.ts";

export function displayCategoryName(cat: { name: string; type: string }, t: Locale): string {
  if (cat.type === "global") {
    return (t.categoryLabels as Record<string, string>)[cat.name] ?? cat.name;
  }
  return cat.name;
}

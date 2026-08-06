import { enUS, esES } from "@clerk/localizations";

export function getClerkLocalization(locale: string | undefined | null) {
  return locale === "en" ? enUS : esES;
}

import { useEffect } from "react";
import { updateClerkOptions } from "@clerk/astro/client";
import { getClerkLocalization } from "@/lib/i18n/clerk-localizations.ts";

interface ClerkLocaleBridgeProps {
  locale: string;
}

export default function ClerkLocaleBridge({ locale }: ClerkLocaleBridgeProps) {
  useEffect(() => {
    try {
      updateClerkOptions({ localization: getClerkLocalization(locale) });
    } catch (e: unknown) {
      console.error(e);
    }
  }, [locale]);

  return null;
}

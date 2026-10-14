import type { LandingFeatureId, NavigationIconId } from "@/lib/types/site.ts";

/** Stable order and icon identity, independent of dictionary property order. */
export const LANDING_FEATURES = [
  { id: "transactions", icon: "dollar" },
  { id: "cards", icon: "card" },
  { id: "installments", icon: "clipboard" },
  { id: "recurring-payments", icon: "recurring" },
  { id: "pantry", icon: "package" },
  { id: "shopping", icon: "cart" },
] as const satisfies readonly { id: LandingFeatureId; icon: NavigationIconId }[];

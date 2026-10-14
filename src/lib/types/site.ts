export type NavigationIconId = "home" | "dollar" | "card" | "clipboard" | "recurring" | "wallet" | "cart" | "pen" | "calendar" | "package" | "tag";
export type LandingFeatureId = "transactions" | "cards" | "installments" | "recurring-payments" | "pantry" | "shopping";

export interface AppNavigationLink {
  id: string;
  url: string;
  label: string;
  icon: NavigationIconId;
}

export interface AppNavigationGroup {
  id: string;
  title?: string;
  links: AppNavigationLink[];
}

export interface LandingNavigationLink {
  id: string;
  href: string;
  label: string;
  external?: boolean;
}

import { getRelativeLocaleUrl } from "astro:i18n";
import { SITE_LINKS } from "@/lib/links.ts";
import type { Locale } from "@/lib/i18n/es.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";
import type { AppNavigationGroup, LandingNavigationLink } from "@/lib/types/site.ts";

export function getLandingNavigation(t: Locale): LandingNavigationLink[] {
  return [
    { id: "features", href: "#features", label: t.landing.navFeatures },
    { id: "about", href: SITE_LINKS.developer, label: t.landing.navAbout, external: true },
  ];
}

export function getAppNavigation(locale: LocaleCode, t: Locale): AppNavigationGroup[] {
  const appUrl = (path: string) => getRelativeLocaleUrl(locale, path);
  return [
    {
      id: "dashboard",
      links: [{ id: "dashboard", url: appUrl("/app/dashboard"), label: t.nav.dashboard, icon: "home" }],
    },
    {
      id: "finance", title: t.nav.groupFinance,
      links: [
        { id: "transactions", url: appUrl("/app/transactions"), label: t.nav.transactions, icon: "dollar" },
        { id: "cards", url: appUrl("/app/cards"), label: t.nav.cards, icon: "card" },
        { id: "installments", url: appUrl("/app/installments"), label: t.nav.installments, icon: "clipboard" },
        { id: "recurring-payments", url: appUrl("/app/recurring-payments"), label: t.nav.recurringPayments, icon: "recurring" },
        { id: "cashback", url: appUrl("/app/cashback"), label: t.nav.cashback, icon: "dollar" },
        { id: "payment-methods", url: appUrl("/app/payment-methods"), label: t.nav.paymentMethods, icon: "wallet" },
      ],
    },
    {
      id: "organization", title: t.nav.groupOrganization,
      links: [
        { id: "shopping", url: appUrl("/app/shopping"), label: t.nav.shopping, icon: "cart" },
        { id: "tasks", url: appUrl("/app/tasks"), label: t.nav.tasks, icon: "clipboard" },
        { id: "notes", url: appUrl("/app/notes"), label: t.nav.notes, icon: "pen" },
        { id: "events", url: appUrl("/app/events"), label: t.nav.events, icon: "calendar" },
        { id: "pantry", url: appUrl("/app/pantry"), label: t.nav.pantry, icon: "package" },
      ],
    },
    {
      id: "general", title: t.nav.groupGeneral,
      links: [{ id: "categories", url: appUrl("/app/categories"), label: t.nav.categories, icon: "tag" }],
    },
  ];
}

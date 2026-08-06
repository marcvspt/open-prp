import type { Locale } from "@/lib/i18n/es.ts";

export const FILTER_WRAP_CLASS = "w-full sm:w-48";
export const FILTER_INPUT_CLASS = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-string w-full col-span-2 sm:w-48 sm:col-span-1";
export const FILTER_LIMPIAR_CLASS = "w-full col-span-2 sm:col-span-1 sm:w-auto px-3 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-danger hover:bg-danger-bg cursor-pointer";
export const FILTER_GRID_CLASS = "grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:items-end sm:flex-1";
export const FILTER_CTA_CLASS = "hidden sm:block sm:shrink-0 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover cursor-pointer";

export const BTN_CLEAR = (t: Locale) => t.filter.btnClear;

export const FILTER_ALL_TYPES = (t: Locale) => t.filter.allTypes;
export const FILTER_ALL_STATUS_TASKS = (t: Locale) => t.filter.allStatusTasks;
export const FILTER_ALL_CATEGORIES = (t: Locale) => t.filter.allCategories;
export const FILTER_ALL_CARDS = (t: Locale) => t.filter.allCards;
export const FILTER_ALL_PAYMENT_METHODS = (t: Locale) => t.filter.allPaymentMethods;
export const FILTER_ALL_STATUS_INSTALLMENTS = (t: Locale) => t.filter.allStatusInstallments;
export const FILTER_ALL_MONTHS = (t: Locale) => t.filter.allMonths;

export const FILTER_ALL_SECTIONS = (t: Locale) => t.filter.allSections;

export const FILTER_SEARCH_DESC = (t: Locale) => t.filter.searchDesc;
export const FILTER_SEARCH_PANTRY = (t: Locale) => t.filter.searchPantry;

export const FILTER_LABEL_TYPE = (t: Locale) => t.filter.labelType;
export const FILTER_LABEL_CATEGORY = (t: Locale) => t.filter.labelCategory;
export const FILTER_LABEL_PAYMENT_METHOD = (t: Locale) => t.filter.labelPaymentMethod;
export const FILTER_LABEL_CARD = (t: Locale) => t.filter.labelCard;
export const FILTER_LABEL_STATUS = (t: Locale) => t.filter.labelStatus;
export const FILTER_LABEL_MONTH = (t: Locale) => t.filter.labelMonth;

export const FILTER_SELECT_FALLBACK = (t: Locale) => t.filter.selectFallback;
export const FILTER_MULTI_SELECT_FALLBACK = (t: Locale) => t.filter.multiSelectFallback;
export const FILTER_LABEL_FILTER = (t: Locale) => t.filter.labelFilter;

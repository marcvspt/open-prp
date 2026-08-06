import type { Locale } from "@/lib/i18n/es.ts";

const INPUT_BASE = "mt-1 block w-full rounded-lg border border-border";
const INPUT_PADDING = "px-3 py-2 text-sm";
export const INPUT_CLASS = `${INPUT_BASE} ${INPUT_PADDING}`;
export const COLOR_CLASS = `${INPUT_BASE} h-10 cursor-pointer`;

export const BTN_EDIT = (t: Locale) => t.common.edit;
export const BTN_DELETE = (t: Locale) => t.common.delete;
export const BTN_CANCEL = (t: Locale) => t.common.cancel;
export const BTN_SAVE = (t: Locale) => t.common.save;
export const BTN_CREATE = (t: Locale) => t.common.saveBtn;
export const BTN_SAVING = (t: Locale) => t.common.saving;
export const BTN_DELETING = (t: Locale) => t.common.deleting;
export const BTN_LOGIN = (t: Locale) => t.common.login;
export const BTN_SIGNUP = (t: Locale) => t.common.signup;

export const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", MXN: "$", USD: "$" };

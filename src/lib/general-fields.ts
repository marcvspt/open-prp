import { labels } from "@/lib/labels.ts";

const INPUT_BASE = "mt-1 block w-full rounded-lg border border-border";
const INPUT_PADDING = "px-3 py-2 text-sm";
export const INPUT_CLASS = `${INPUT_BASE} ${INPUT_PADDING}`;
export const COLOR_CLASS = `${INPUT_BASE} h-10 cursor-pointer`;

export const BTN_EDIT = labels.common.edit;
export const BTN_DELETE = labels.common.delete;
export const BTN_CANCEL = labels.common.cancel;
export const BTN_SAVE = labels.common.save;
export const BTN_CREATE = labels.common.saveBtn;
export const BTN_SAVING = labels.common.saving;
export const BTN_DELETING = labels.common.deleting;
export const BTN_LOGIN = labels.common.login;
export const BTN_SIGNUP = labels.common.signup;

export const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", MXN: "$", USD: "$" };

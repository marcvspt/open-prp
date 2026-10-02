import type { Field, CrudForm } from "@/lib/types/crud.ts";
import type { Locale } from "@/lib/i18n/es.ts";

export function isFieldVisible(field: Field, form: CrudForm): boolean {
  return !field.showIf || String(form[field.showIf.field]) === field.showIf.value;
}

export function createDefaultForm(fields: readonly Field[], defaults: CrudForm): CrudForm {
  const form = { ...defaults };
  const localDate = new Date().toLocaleDateString("sv");
  for (const field of fields) {
    if (field.type === "date" && !form[field.name]) form[field.name] = localDate;
    if (field.type === "month" && !form[field.name]) form[field.name] = localDate.slice(0, 7);
  }
  return form;
}

export function createCrudPayload(fields: readonly Field[], form: CrudForm, t: Locale): CrudForm {
  const payload = { ...form };
  for (const field of fields) {
    if (!isFieldVisible(field, form)) {
      payload[field.name] = null;
    } else if (field.type === "number") {
      const raw = String(form[field.name] ?? "").trim();
      if (!raw && !field.required) {
        payload[field.name] = null;
        continue;
      }
      const value = Number(raw);
      if (!raw || !Number.isFinite(value)) throw new Error(t.error.invalidNumber(field.label));
      if (field.min !== undefined && value < field.min) throw new Error(t.error.numberMinimum(field.label, field.min));
      payload[field.name] = value;
    }
  }
  return payload;
}

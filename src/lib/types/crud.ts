import type { LocaleCode } from "@/lib/i18n/locale.ts";

export interface FieldOption {
  value: string;
  label: string;
}

interface FieldBase {
  name: string;
  label: string;
  required?: boolean;
  showIf?: { field: string; value: string };
}

export type Field = FieldBase & (
  | { type: "select" | "multiselect"; options: readonly FieldOption[]; placeholder?: string }
  | { type: "number"; step?: string; min?: number; placeholder?: string }
  | { type: "text" | "textarea" | "date" | "month"; placeholder?: string }
  | { type: "checkbox" | "color" }
);

export type CrudForm = Record<string, unknown>;

export interface CrudModalProps {
  module: string;
  fields: string;
  defaultForm: string;
  titleSingular: string;
  locale?: LocaleCode;
}

export interface CrudFieldProps {
  field: Field;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

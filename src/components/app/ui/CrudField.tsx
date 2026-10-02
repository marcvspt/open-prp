import Select from "@/components/ui/Select.tsx";
import MultiSelect from "@/components/ui/MultiSelect.tsx";
import { INPUT_CLASS, COLOR_CLASS } from "@/lib/i18n/general-fields.ts";
import type { CrudFieldProps } from "@/lib/types/crud.ts";

export default function CrudField({ field, id, value, onChange }: CrudFieldProps) {
  let input;
  switch (field.type) {
    case "select":
      input = <div className="mt-1"><Select value={String(value ?? "")} onChange={onChange} options={field.options} required={field.required} placeholder={field.placeholder} ariaLabel={field.label} /></div>;
      break;
    case "multiselect":
      input = <div className="mt-1"><MultiSelect value={String(value ?? "[]")} onChange={onChange} options={[...field.options]} required={field.required} placeholder={field.placeholder} ariaLabel={field.label} /></div>;
      break;
    case "textarea":
      input = <textarea id={id} value={String(value ?? "")} onChange={e => onChange(e.target.value)} rows={4} className={INPUT_CLASS} placeholder={field.placeholder} required={field.required} />;
      break;
    case "checkbox":
      input = <input id={id} type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} required={field.required} className="mt-1 block w-4 h-4 accent-primary" />;
      break;
    case "color":
      input = <input id={id} type="color" value={value ? String(value) : "#6366f1"} onChange={e => onChange(e.target.value)} className={COLOR_CLASS} />;
      break;
    case "number":
      input = <input id={id} type="number" value={String(value ?? "")} onChange={e => onChange(e.target.value)} step={field.step} min={field.min} className={INPUT_CLASS} placeholder={field.placeholder} required={field.required} />;
      break;
    default:
      input = <input id={id} type={field.type} value={String(value ?? "")} onChange={e => onChange(e.target.value)} className={INPUT_CLASS} placeholder={field.placeholder} required={field.required} />;
  }
  const customSelect = field.type === "select" || field.type === "multiselect";
  return <div>
    {customSelect ? (
      <span className="block text-sm font-medium text-string">{field.label}{field.required && <span className="text-danger ml-1">*</span>}</span>
    ) : (
      <label htmlFor={id} className="block text-sm font-medium text-string">{field.label}{field.required && <span className="text-danger ml-1">*</span>}</label>
    )}
    {input}
  </div>;
}

import { useState, useEffect, useCallback, useId } from "react";
import { apiFetch } from "@/lib/api-client.ts";
import { FormModal } from "@/components/app/ui/FormModal.tsx";
import Select from "@/components/ui/Select.tsx";
import MultiSelect from "@/components/ui/MultiSelect.tsx";
import { INPUT_CLASS, COLOR_CLASS, BTN_CANCEL, BTN_SAVE, BTN_CREATE, BTN_SAVING } from "@/lib/form-fields.ts";

export interface Field {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "month" | "select" | "multiselect" | "textarea" | "checkbox" | "color";
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: string;
  min?: number;
  placeholder?: string;
  showIf?: { field: string; value: string };
}

interface CrudModalProps {
  module: string;
  fields: string;
  defaultForm: string;
  titleSingular: string;
}

export default function CrudModal({ module, fields: fieldsJson, defaultForm: defaultJson, titleSingular }: CrudModalProps) {
  const id = useId();
  const fields: Field[] = JSON.parse(fieldsJson);
  const defaultForm: Record<string, unknown> = JSON.parse(defaultJson);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    const base = { ...defaultForm };
    const now = new Date();
    const localDate = now.toLocaleDateString("sv");
    const localMonth = localDate.slice(0, 7);
    for (const f of fields) {
      if ((f.type === "date" || ["date","start_date","end_date","due_date"].includes(f.name)) && !base[f.name]) {
        base[f.name] = localDate;
      }
      if (f.type === "month" && !base[f.name]) {
        base[f.name] = localMonth;
      }
    }
    setForm(base);
    setEditingId(null);
  }, [defaultJson]);

  useEffect(() => {
    if (!open || editingId) return;
    try {
      const saved = localStorage.getItem("currency");
      if (saved && ["EUR", "MXN", "USD"].includes(saved)) {
        setForm(f => ({ ...f, currency: saved }));
      }
    } catch {}
  }, [open, editingId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const createBtn = target.closest<HTMLElement>(`[data-create="${module}"]`);
      if (createBtn) {
        reset();
        setError("");
        setOpen(true);
        return;
      }
      const editBtn = target.closest<HTMLElement>(`[data-edit-${module}]`);
      if (editBtn) {
        const id = editBtn.getAttribute(`data-edit-${module}`);
        if (!id) return;
        setSaving(true);
        apiFetch<{ data: Record<string, unknown> }>(`/api/${module}/${id}`).then(r => {
          setForm({ ...r.data });
          setEditingId(id);
          setError("");
          setOpen(true);
          setSaving(false);
        }).catch(() => setSaving(false));
        return;
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [module, reset]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Fields hidden by showIf don't apply to the current form state — persist them as null.
      const payload: Record<string, unknown> = { ...form };
      for (const f of fields) {
        if (f.showIf && String(form[f.showIf.field]) !== f.showIf.value) {
          payload[f.name] = null;
        } else if (f.type === "number") {
          payload[f.name] = parseFloat(String(payload[f.name])) || 0;
        }
      }
      if (editingId) {
        await apiFetch(`/api/${module}/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/${module}`, { method: "POST", body: JSON.stringify(payload) });
      }
      setOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  function setVal(name: string, value: unknown) {
    setForm(f => ({ ...f, [name]: value }));
  }

  return (
    <>
      {saving && editingId && <div className="fixed inset-0 z-40 flex items-center justify-center bg-overlay"><div className="bg-panel p-4 rounded-lg text-sm">Cargando...</div></div>}
      <FormModal open={open} onClose={() => setOpen(false)} title={editingId ? `Editar ${titleSingular}` : `Nuevo ${titleSingular}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.filter(f => !f.showIf || String(form[f.showIf.field]) === f.showIf.value).map(f => (
            <div key={f.name}>
              <label htmlFor={`${id}-${f.name}`} className="block text-sm font-medium text-string">{f.label}{f.required && <span className="text-danger ml-1">*</span>}</label>
              {f.type === "multiselect" ? (
                <div id={`${id}-${f.name}`} className="mt-1"><MultiSelect value={String(form[f.name] ?? "[]")} onChange={v => setVal(f.name, v)} options={f.options ?? []} placeholder={f.placeholder} ariaLabel={f.label} /></div>
              ) : f.type === "select" ? (
                <div id={`${id}-${f.name}`} className="mt-1"><Select value={String(form[f.name] ?? "")} onChange={v => setVal(f.name, v)} options={f.options ?? []} required={f.required} ariaLabel={f.label} /></div>
              ) : f.type === "textarea" ? (
                <textarea id={`${id}-${f.name}`} value={String(form[f.name] ?? "")} onChange={e => setVal(f.name, e.target.value)} rows={4} className={INPUT_CLASS} placeholder={f.placeholder} required={f.required} />
              ) : f.type === "checkbox" ? (
                <input id={`${id}-${f.name}`} type="checkbox" checked={Boolean(form[f.name])} onChange={e => setVal(f.name, e.target.checked)} className="mt-1 block w-4 h-4 accent-primary" />
              ) : f.type === "color" ? (
                <input id={`${id}-${f.name}`} type="color" value={form[f.name] ? String(form[f.name]) : "#6366f1"} onChange={e => setVal(f.name, e.target.value)} className={COLOR_CLASS} />
              ) : (
                <input id={`${id}-${f.name}`} type={f.type} value={String(form[f.name] ?? "")} onChange={e => setVal(f.name, e.target.value)} step={f.step} min={f.min} className={INPUT_CLASS} placeholder={f.placeholder} required={f.required} />
              )}
            </div>
          ))}
          {error && (
            <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-string hover:bg-surface-alt cursor-pointer">{BTN_CANCEL}</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50 cursor-pointer">{saving ? BTN_SAVING : editingId ? BTN_SAVE : BTN_CREATE}</button>
          </div>
        </form>
      </FormModal>
    </>
  );
}

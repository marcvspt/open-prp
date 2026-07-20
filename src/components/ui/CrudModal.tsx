import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { FormModal } from "./FormModal";
import Select from "./Select";

export interface Field {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "month" | "select" | "textarea" | "checkbox" | "color";
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: string;
  min?: number;
  placeholder?: string;
}

interface CrudModalProps {
  module: string;
  fields: string;
  defaultForm: string;
  titleSingular: string;
}

export default function CrudModal({ module, fields: fieldsJson, defaultForm: defaultJson, titleSingular }: CrudModalProps) {
  const fields: Field[] = JSON.parse(fieldsJson);
  const defaultForm: Record<string, unknown> = JSON.parse(defaultJson);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setForm({ ...defaultForm });
    setEditingId(null);
  }, [defaultJson]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const createBtn = target.closest<HTMLElement>(`[data-create="${module}"]`);
      if (createBtn) {
        reset();
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
    try {
      if (editingId) {
        await apiFetch(`/api/${module}/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await apiFetch(`/api/${module}`, { method: "POST", body: JSON.stringify(form) });
      }
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function setVal(name: string, value: unknown) {
    setForm(f => ({ ...f, [name]: value }));
  }

  return (
    <>
      {saving && editingId && <div class="fixed inset-0 z-40 flex items-center justify-center bg-overlay"><div class="bg-panel p-4 rounded-lg text-sm">Cargando...</div></div>}
      <FormModal open={open} onClose={() => setOpen(false)} title={editingId ? `Editar ${titleSingular}` : `Nuevo ${titleSingular}`}>
        <form onSubmit={handleSubmit} class="space-y-4">
          {fields.map(f => (
            <div key={f.name}>
              <label class="block text-sm font-medium text-text">{f.label}</label>
              {f.type === "select" ? (
                <Select value={String(form[f.name] ?? "")} onChange={v => setVal(f.name, v)} options={f.options ?? []} required={f.required} />
              ) : f.type === "textarea" ? (
                <textarea value={String(form[f.name] ?? "")} onChange={e => setVal(f.name, e.target.value)} rows={4} class="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder={f.placeholder} required={f.required} />
              ) : f.type === "checkbox" ? (
                <input type="checkbox" checked={Boolean(form[f.name])} onChange={e => setVal(f.name, e.target.checked)} class="mt-1 block w-4 h-4 accent-indigo-600" />
              ) : f.type === "color" ? (
                <input type="color" value={String(form[f.name] ?? "#6366f1")} onChange={e => setVal(f.name, e.target.value)} class="mt-1 block w-full h-10 rounded-lg border border-border cursor-pointer" />
              ) : (
                <input type={f.type} value={String(form[f.name] ?? "")} onChange={e => setVal(f.name, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)} step={f.step} min={f.min} class="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder={f.placeholder} required={f.required} />
              )}
            </div>
          ))}
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} class="px-4 py-2 text-sm text-nav hover:text-text">Cancelar</button>
            <button type="submit" disabled={saving} class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? "Guardando..." : editingId ? "Guardar" : "Crear"}</button>
          </div>
        </form>
      </FormModal>
    </>
  );
}

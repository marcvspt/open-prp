import { useState, useEffect, useCallback, useRef } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "@/lib/api-client.ts";
import { createDefaultForm, createCrudPayload } from "@/lib/ui/crud-form.ts";
import type { Field, CrudForm } from "@/lib/types/crud.ts";
import type { Locale } from "@/lib/i18n/es.ts";

export function useCrudModal(module: string, fields: readonly Field[], defaults: CrudForm, t: Locale) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CrudForm>({ ...defaults });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadController = useRef<AbortController | null>(null);
  const savingRef = useRef(false);

  const close = useCallback(() => {
    if (savingRef.current) return;
    loadController.current?.abort();
    setLoading(false);
    setOpen(false);
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (savingRef.current) return;
      if (!(event.target instanceof Element)) return;
      const createBtn = event.target.closest(`[data-create="${module}"]`);
      const editBtn = event.target.closest(`[data-edit-${module}]`);
      if (!createBtn && !editBtn) return;
      loadController.current?.abort();
      setError("");
      if (createBtn) {
        const base = createDefaultForm(fields, defaults);
        try {
          const currency = localStorage.getItem("currency");
          if ("currency" in base && currency && ["EUR", "MXN", "USD"].includes(currency)) base.currency = currency;
        } catch {}
        setForm(base);
        setEditingId(null);
        setLoading(false);
        setLoaded(true);
        setOpen(true);
        return;
      }
      const id = editBtn?.getAttribute(`data-edit-${module}`);
      if (!id) return;
      const controller = new AbortController();
      loadController.current = controller;
      setForm({});
      setEditingId(id);
      setLoaded(false);
      setLoading(true);
      setOpen(true);
      async function load() {
        try {
          const result = await apiFetch<{ data: CrudForm }>(`/api/${module}/${id}`, { signal: controller.signal });
          if (controller.signal.aborted) return;
          setForm({ ...result.data });
          setLoaded(true);
        } catch (err: unknown) {
          if (!controller.signal.aborted) setError(t.error.loadRecord(err instanceof Error ? err.message : t.common.errorUnknown));
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }
      void load();
    };
    document.addEventListener("click", handler);
    return () => {
      loadController.current?.abort();
      document.removeEventListener("click", handler);
    };
  }, [module, fields, defaults, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || savingRef.current || !loaded) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const payload = createCrudPayload(fields, form, t);
      await apiFetch(editingId ? `/api/${module}/${editingId}` : `/api/${module}`, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setOpen(false);
      window.location.href = window.location.href;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.common.errorUnknown);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function setVal(name: string, value: unknown) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  return { open, close, editingId, form, loading, loaded, saving, error, handleSubmit, setVal };
}

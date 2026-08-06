import { useState, useEffect } from "react";
import { FormModal } from "@/components/app/ui/FormModal.tsx";
import { BTN_CANCEL, BTN_DELETE, BTN_DELETING } from "@/lib/i18n/general-fields.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { LocaleCode } from "@/lib/i18n/locale.ts";

interface Props {
  module: string;
  label?: string;
  locale?: LocaleCode;
}

/** Styled confirmation dialog for `[data-delete-{module}]` triggers (replaces native confirm()). */
export default function ConfirmDelete({ module, label, locale = "es" }: Props) {
  const t = getLocaleDict(locale);
  const deleteLabel = label ?? t.common.element;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const del = (e.target as HTMLElement).closest(`[data-delete-${module}]`);
      const id = del?.getAttribute(`data-delete-${module}`);
      if (id) {
        setError("");
        setDeleteId(id);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [module]);

  async function handleConfirm() {
    if (!deleteId) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/${module}/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setError(t.common.errorDelete);
      setDeleting(false);
    }
  }

  return (
    <LocaleProvider locale={locale}>
      <FormModal open={deleteId !== null} onClose={() => setDeleteId(null)} title={t.common.deleteTitle(deleteLabel)}>
        <p className="text-sm text-string-muted">
          {t.common.deleteConfirm(deleteLabel)}
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-6">
          <button
            type="button"
            onClick={() => setDeleteId(null)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-string hover:bg-surface-alt cursor-pointer"
          >
            {BTN_CANCEL(t)}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-danger text-white hover:bg-danger-hover disabled:opacity-50 cursor-pointer"
          >
            {deleting ? BTN_DELETING(t) : BTN_DELETE(t)}
          </button>
        </div>
      </FormModal>
    </LocaleProvider>
  );
}

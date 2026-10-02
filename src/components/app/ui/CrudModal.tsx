import { useMemo, useId } from "react";
import { FormModal } from "@/components/app/ui/FormModal.tsx";
import CrudField from "@/components/app/ui/CrudField.tsx";
import { BTN_CANCEL, BTN_SAVE, BTN_CREATE, BTN_SAVING } from "@/lib/i18n/general-fields.ts";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider.tsx";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import { useCrudModal } from "@/lib/ui/useCrudModal.ts";
import { isFieldVisible } from "@/lib/ui/crud-form.ts";
import type { Field, CrudForm, CrudModalProps } from "@/lib/types/crud.ts";

export default function CrudModal({ module, fields: fieldsJson, defaultForm: defaultJson, titleSingular, locale = "es" }: CrudModalProps) {
  const t = getLocaleDict(locale);
  const id = useId();
  const fields = useMemo(() => JSON.parse(fieldsJson) as Field[], [fieldsJson]);
  const defaults = useMemo(() => JSON.parse(defaultJson) as CrudForm, [defaultJson]);
  const { open, close, editingId, form, loading, loaded, saving, error, handleSubmit, setVal } = useCrudModal(module, fields, defaults, t);

  return (
    <LocaleProvider locale={locale}>
      <FormModal open={open} onClose={close} title={editingId ? t.common.editSingular(titleSingular) : t.common.newSingular(titleSingular)}>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading || saving}>
          {loading && <p role="status" className="text-sm text-string-muted">{t.common.loading}</p>}
          {loaded && <fieldset disabled={saving} className="space-y-4">
            {fields.filter(field => isFieldVisible(field, form)).map(field => (
              <CrudField key={field.name} field={field} id={`${id}-${field.name}`} value={form[field.name]} onChange={value => setVal(field.name, value)} />
            ))}
          </fieldset>}
          {error && <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-string hover:bg-surface-alt disabled:opacity-50 cursor-pointer">{BTN_CANCEL(t)}</button>
            <button type="submit" disabled={saving || loading || !loaded} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50 cursor-pointer">{saving ? BTN_SAVING(t) : editingId ? BTN_SAVE(t) : BTN_CREATE(t)}</button>
          </div>
        </form>
      </FormModal>
    </LocaleProvider>
  );
}

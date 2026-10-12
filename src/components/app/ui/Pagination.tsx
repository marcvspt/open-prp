import { getLocaleDict, type LocaleCode } from "@/lib/i18n/locale.ts";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  locale: LocaleCode;
}

export default function Pagination({ page, total, pageSize, loading, onPageChange, locale }: Props) {
  const t = getLocaleDict(locale);
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || loading}
        className="rounded border border-border px-3 py-2 text-string-muted hover:bg-nav-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t.common.pagination.previous}
      </button>
      <span className="text-string-muted" aria-live="polite">
        {t.common.pagination.page(page, totalPages)}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages || loading}
        className="rounded border border-border px-3 py-2 text-string-muted hover:bg-nav-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t.common.pagination.next}
      </button>
    </div>
  );
}

import ArrowRightIcon from "@/assets/arrow-right.svg?react";
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
        className="min-h-11 rounded-lg border border-border px-3 py-2 text-string-muted enabled:cursor-pointer enabled:hover:bg-nav-hover disabled:cursor-not-allowed disabled:opacity-50"
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
        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-primary bg-primary-bg px-3 py-2 font-medium text-primary-text enabled:cursor-pointer enabled:hover:bg-primary-border disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t.common.pagination.next}
        <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
      </button>
    </div>
  );
}

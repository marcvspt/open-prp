import { useState, useRef, useEffect, useLayoutEffect, useId } from "react";
import { createPortal } from "react-dom";
import ChevronIcon from "@/assets/chevron.svg?react";
import { FILTER_SELECT_FALLBACK } from "@/lib/i18n/filter-fields.ts";
import { useLocaleDict } from "@/lib/i18n/LocaleProvider.tsx";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  fitWidest?: boolean;
}

export default function Select({ value, onChange, options, placeholder, required, disabled, className, ariaLabel, fitWidest }: SelectProps) {
  const t = useLocaleDict();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const [widest, setWidest] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find(o => o.value === value);
  const display = selected?.label ?? placeholder ?? FILTER_SELECT_FALLBACK(t);

  useLayoutEffect(() => {
    if (!fitWidest || !measureRef.current) return;
    const measure = () => {
      const widths = Array.from(measureRef.current!.children).map(el => el.getBoundingClientRect().width);
      setWidest(widths.length ? Math.max(...widths) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, [fitWidest, options]);

  useEffect(() => {
    if (!open) { setHighlighted(-1); setPos(null); return; }
    const idx = options.findIndex(o => o.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.max(60, window.innerHeight - r.bottom - 8) });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) && listRef.current && !listRef.current.contains(e.target as Node)) setOpen(false);
    }
    function reposition() {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.max(60, window.innerHeight - r.bottom - 8) });
      }
    }
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current || highlighted < 0) return;
    const el = listRef.current.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function select(val: string) {
    onChange(val);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted(p => (p + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted(p => (p <= 0 ? options.length - 1 : p - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlighted >= 0 && highlighted < options.length) select(options[highlighted].value);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`} onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        aria-activedescendant={highlighted >= 0 ? `${id}-opt-${highlighted}` : undefined}
        disabled={disabled}
        onClick={() => setOpen(p => !p)}
        style={fitWidest && widest > 0 ? { minWidth: widest } : undefined}
        className={`flex items-center gap-2 w-full rounded-lg border text-sm px-3 py-2 transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary"}
          ${open ? "border-primary ring-1 ring-primary" : "border-border"}
          ${!selected && placeholder ? "text-string-muted" : "text-string"}
          bg-panel`}
      >
        {selected?.icon && <span className="w-4 h-4 shrink-0">{selected.icon}</span>}
        <span className="flex-1 text-left">{display}</span>
        <ChevronIcon aria-hidden="true" className={`w-4 h-4 text-string-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {fitWidest && (
        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-[-9999px] flex flex-col items-start"
          style={{ visibility: "hidden" }}
        >
          {options.map(o => (
            <div key={o.value} className="flex items-center gap-2 px-3 py-2 text-sm border border-transparent whitespace-nowrap">
              {o.icon && <span className="w-4 h-4 shrink-0">{o.icon}</span>}
              <span>{o.label}</span>
              <ChevronIcon aria-hidden="true" className="w-4 h-4 shrink-0 text-string-muted" />
            </div>
          ))}
        </div>
      )}
      {open && pos && createPortal(
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label={t.select.ariaOptions}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, zIndex: 9999 }}
          className="rounded-lg border border-border bg-panel shadow-lg overflow-y-auto"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
               className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors
                ${o.value === value ? "bg-primary-bg text-primary-text font-medium" : ""}
                ${highlighted === i ? "bg-nav-hover" : ""}
                text-string`}
              onClick={() => select(o.value)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {o.icon && <span className="w-4 h-4 shrink-0">{o.icon}</span>}
              {o.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

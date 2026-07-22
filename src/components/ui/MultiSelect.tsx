import { useState, useRef, useEffect, useId } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  class?: string;
}

export default function MultiSelect({ value, onChange, options, placeholder, required, disabled, class: className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  let selectedValues: string[] = [];
  try { selectedValues = JSON.parse(value); } catch { selectedValues = []; }
  if (!Array.isArray(selectedValues)) selectedValues = [];

  const allSelected = selectedValues.length === options.length && options.length > 0;
  const display = allSelected
    ? "Todas las secciones"
    : selectedValues.length === 0
      ? placeholder ?? "Seleccionar secciones..."
      : selectedValues.length === 1
        ? options.find(o => o.value === selectedValues[0])?.label ?? selectedValues[0]
        : `${selectedValues.length} secciones`;

  useEffect(() => {
    if (!open) { setHighlighted(-1); return; }
    setHighlighted(0);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open || !listRef.current || highlighted < 0) return;
    const el = listRef.current.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function toggle(val: string) {
    const idx = selectedValues.indexOf(val);
    let next: string[];
    if (val === "*") {
      next = allSelected ? [] : options.map(o => o.value);
    } else {
      if (idx >= 0) {
        next = selectedValues.filter(v => v !== val);
      } else {
        next = [...selectedValues, val];
      }
    }
    onChange(JSON.stringify(next));
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
        setHighlighted(p => (p + 1) % (options.length + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted(p => (p <= 0 ? options.length : p - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlighted === 0) {
          toggle("*");
        } else if (highlighted > 0 && highlighted <= options.length) {
          toggle(options[highlighted - 1].value);
        }
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
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={() => setOpen(p => !p)}
        className={`mt-1 flex items-center gap-2 w-full rounded-lg border text-sm px-3 py-2 transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-indigo-400"}
          ${open ? "border-indigo-500 ring-1 ring-indigo-500" : "border-border"}
          ${selectedValues.length === 0 && !allSelected ? "text-text-muted" : "text-text"}
          bg-panel`}
      >
        <span className="flex-1 text-left truncate">{display}</span>
        <svg className={`w-4 h-4 text-text-muted transition-transform shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Secciones"
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-panel shadow-lg max-h-60 overflow-y-auto"
        >
          <li
            role="option"
            aria-selected={allSelected}
            className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2
              ${highlighted === 0 ? "bg-nav-hover" : ""}
              text-text`}
            onClick={() => toggle("*")}
            onMouseEnter={() => setHighlighted(0)}
          >
            <input type="checkbox" checked={allSelected} read-only className="w-4 h-4 accent-indigo-600 pointer-events-none" />
            <span className={allSelected ? "font-medium text-indigo-600" : ""}>Todas las secciones</span>
          </li>
          {options.map((o, i) => {
            const idx = i + 1;
            const isSelected = selectedValues.includes(o.value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2
                  ${isSelected ? "bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-700" : ""}
                  ${highlighted === idx ? "bg-nav-hover" : ""}
                  text-text`}
                onClick={() => toggle(o.value)}
                onMouseEnter={() => setHighlighted(idx)}
              >
                <input type="checkbox" checked={isSelected} read-only className="w-4 h-4 accent-indigo-600 pointer-events-none" />
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

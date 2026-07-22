import { useState, useRef, useEffect, useId } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  class?: string;
  icon?: React.ReactNode;
}

export default function Select({ value, onChange, options, placeholder, required, disabled, class: className, icon }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selected = options.find(o => o.value === value);
  const display = selected?.label ?? placeholder ?? "Seleccionar...";

  useEffect(() => {
    if (!open) { setHighlighted(-1); return; }
    const idx = options.findIndex(o => o.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
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
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={highlighted >= 0 ? `${id}-opt-${highlighted}` : undefined}
        disabled={disabled}
        onClick={() => setOpen(p => !p)}
        className={`mt-1 flex items-center gap-2 w-full rounded-lg border text-sm px-3 py-2 transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-indigo-400"}
          ${open ? "border-indigo-500 ring-1 ring-indigo-500" : "border-border"}
          ${!selected && placeholder ? "text-text-muted" : "text-text"}
          bg-panel`}
      >
        {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
        <span className="flex-1 text-left">{display}</span>
        <svg className={`w-4 h-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Opciones"
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-panel shadow-lg max-h-60 overflow-y-auto"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
               className={`px-3 py-2 text-sm cursor-pointer transition-colors
                ${o.value === value ? "bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-700 font-medium" : ""}
                ${highlighted === i ? "bg-nav-hover" : ""}
                text-text`}
              onClick={() => select(o.value)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

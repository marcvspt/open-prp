import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import ChevronIcon from "@/assets/chevron.svg?react";
import { FILTER_ALL_SECTIONS, FILTER_MULTI_SELECT_FALLBACK } from "@/lib/i18n/filter-fields.ts";
import { useLocaleDict } from "@/lib/i18n/LocaleProvider.tsx";
import { getDropdownPosition } from "@/lib/ui/dropdown-position.ts";

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  class?: string;
  ariaLabel?: string;
}

export default function MultiSelect({ value, onChange, options, placeholder, required, disabled, class: className, ariaLabel }: MultiSelectProps) {
  const t = useLocaleDict();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [pos, setPos] = useState<ReturnType<typeof getDropdownPosition> | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const bulkRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { parsed = []; }
  const selectedValues = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  const selected = new Set(selectedValues);
  const enabledOptions = options.filter(option => !option.disabled);

  const allSelected = enabledOptions.length > 0 && enabledOptions.every(option => selected.has(option.value));
  const display = allSelected
    ? FILTER_ALL_SECTIONS(t)
    : selectedValues.length === 0
      ? placeholder ?? FILTER_MULTI_SELECT_FALLBACK(t)
      : selectedValues.length === 1
        ? options.find(o => o.value === selectedValues[0])?.label ?? selectedValues[0]
        : t.select.countSections(selectedValues.length);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target) && !popupRef.current?.contains(event.target)) setOpen(false);
    }
    function reposition(event: Event) {
      if (event.target instanceof Node && popupRef.current?.contains(event.target)) return;
      if (btnRef.current) setPos(getDropdownPosition(btnRef.current));
    }
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current || highlighted < 0) return;
    const el = listRef.current.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function toggle(option: MultiSelectOption) {
    if (option.disabled) return;
    if (selected.has(option.value)) selected.delete(option.value);
    else selected.add(option.value);
    onChange(JSON.stringify([...selected]));
  }

  function toggleAll() {
    for (const option of enabledOptions) {
      if (allSelected) selected.delete(option.value);
      else selected.add(option.value);
    }
    onChange(JSON.stringify([...selected]));
  }

  function openPopup() {
    if (!btnRef.current) return;
    const firstSelected = options.findIndex(option => !option.disabled && selected.has(option.value));
    setHighlighted(firstSelected < 0 ? options.findIndex(option => !option.disabled) : firstSelected);
    setPos(getDropdownPosition(btnRef.current));
    setOpen(true);
  }

  function closePopup() {
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const indexes = options.flatMap((option, index) => option.disabled ? [] : [index]);
    const index = indexes.indexOf(highlighted);
    const option = options[highlighted];
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!indexes.length) break;
        const next = index + (event.key === "ArrowDown" ? 1 : -1);
        setHighlighted(indexes[(next + indexes.length) % indexes.length]);
        break;
      }
      case "Home":
      case "End":
        event.preventDefault();
        setHighlighted((event.key === "Home" ? indexes[0] : indexes.at(-1)) ?? -1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (option) toggle(option);
        break;
      case "Tab":
        if (event.shiftKey && bulkRef.current && !bulkRef.current.disabled) {
          event.preventDefault();
          bulkRef.current.focus();
        } else {
          closePopup();
        }
        break;
    }
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`} onBlur={event => {
      if (!ref.current?.contains(event.relatedTarget) && !popupRef.current?.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-describedby={ariaLabel ? `${id}-value` : undefined}
        disabled={disabled || options.length === 0}
        onClick={open ? closePopup : openPopup}
        onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openPopup();
          }
        }}
        className={`flex items-center gap-2 w-full rounded-lg border text-sm px-3 py-2 transition-colors
          ${disabled || options.length === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary"}
          ${open ? "border-primary ring-1 ring-primary" : "border-border"}
          ${selectedValues.length === 0 && !allSelected ? "text-string-muted" : "text-string"}
          bg-panel`}
      >
        <span id={`${id}-value`} className="flex-1 text-left truncate">{display}</span>
        <ChevronIcon aria-hidden="true" className={`w-4 h-4 text-string-muted transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && createPortal(
        <div
          ref={popupRef}
          style={{ position: "fixed", ...pos, zIndex: 9999 }}
          className="flex flex-col overflow-hidden rounded-lg border border-border bg-panel shadow-lg"
          onKeyDown={event => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closePopup();
            }
          }}
        >
          <button
            ref={bulkRef}
            type="button"
            disabled={enabledOptions.length === 0}
            className="shrink-0 border-b border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-nav-hover focus-visible:outline-offset-[-2px] disabled:opacity-50"
            onClick={toggleAll}
            onKeyDown={event => {
              if (event.key !== "Tab") return;
              event.preventDefault();
              if (event.shiftKey) closePopup();
              else listRef.current?.focus();
            }}
          >
            {allSelected ? t.select.clearSelection : t.select.selectAll}
          </button>
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            tabIndex={0}
            aria-multiselectable="true"
            aria-required={required || undefined}
            aria-label={ariaLabel ?? t.select.ariaSections}
            aria-activedescendant={options[highlighted] ? `${id}-opt-${highlighted}` : undefined}
            className="min-h-0 overflow-y-auto focus-visible:outline-offset-[-2px]"
            onKeyDown={onListKeyDown}
          >
            {options.map((option, index) => {
              const isSelected = selected.has(option.value);
              return (
                <li
                  key={option.value}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  className={`flex items-center gap-2 px-3 py-2 text-sm text-string
                    ${option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                    ${isSelected ? "bg-primary-bg text-primary-text" : ""}
                    ${highlighted === index ? "bg-nav-hover" : ""}`}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => toggle(option)}
                  onMouseEnter={() => { if (!option.disabled) setHighlighted(index); }}
                >
                  <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-current">
                    {isSelected ? "✓" : ""}
                  </span>
                  {option.label}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

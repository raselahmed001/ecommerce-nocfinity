"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

interface Option {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

/** Reads <option> / <optgroup> children, so a normal <select>'s markup keeps working. */
function collect(children: ReactNode, group?: string): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string | number; label?: string; children?: ReactNode; disabled?: boolean };

    if (child.type === "option") {
      const label = Children.toArray(props.children).join("");
      out.push({ value: String(props.value ?? label), label, group, disabled: props.disabled });
    } else if (child.type === "optgroup") {
      out.push(...collect(props.children, props.label));
    } else if (props.children) {
      out.push(...collect(props.children, group)); // fragments
    }
  });
  return out;
}

export interface SelectChange {
  target: { value: string };
}

/** Search box appears when there are more options than this (like Select2's minimumResultsForSearch). */
const SEARCH_FROM = 6;

/**
 * A Select2-style dropdown: a button that opens a list with an optional search box.
 * It takes the same props and <option> children as a native <select>.
 */
export function Select({
  id,
  value,
  onChange,
  children,
  invalid,
  className = "",
  variant = "box",
  placeholder = "Select...",
  "aria-label": ariaLabel,
  disabled,
}: {
  id?: string;
  value: string;
  onChange?: (event: SelectChange) => void;
  children: ReactNode;
  invalid?: boolean;
  className?: string;
  /** "box" looks like an input, "plain" is just text with an arrow (used for sorting). */
  variant?: "box" | "plain";
  placeholder?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  const options = collect(children);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const searchable = options.length > SEARCH_FROM;
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? options.filter((o) => o.label.toLowerCase().includes(term) || (o.group ?? "").toLowerCase().includes(term)) : options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, children]);

  const selected = options.find((o) => o.value === String(value));

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted row in view while using the arrow keys.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  const openMenu = () => {
    if (disabled) return;
    setQuery("");
    setCursor(Math.max(0, options.findIndex((o) => o.value === String(value))));
    setOpen(true);
  };

  const choose = (option: Option | undefined) => {
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value } });
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(visible[cursor]);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const box =
    "flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 text-left text-sm text-black outline-none transition focus:border-black dark:bg-neutral-900 dark:text-white dark:focus:border-white " +
    (invalid ? "border-red-500" : "border-black/15 dark:border-white/20");
  const plain = "flex items-center gap-1 font-medium outline-none";

  return (
    <div ref={root} className={`relative ${variant === "box" ? "w-full" : "inline-block"}`} onKeyDown={onKeyDown}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`${variant === "box" ? box : plain} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
      >
        <span className={`truncate ${selected ? "" : "text-black/40 dark:text-white/40"}`}>{selected?.label ?? placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 min-w-full rounded-xl border border-black/10 bg-white p-1 text-sm text-black shadow-lg dark:border-white/15 dark:bg-neutral-900 dark:text-white ${
            variant === "plain" ? "right-0 w-52" : "left-0"
          }`}
        >
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCursor(0);
              }}
              placeholder="Search..."
              aria-label="Search options"
              className="mb-1 h-9 w-full rounded-lg border border-black/15 bg-transparent px-3 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
            />
          )}
          <div ref={list} id={listId} role="listbox" className="max-h-60 overflow-y-auto">
            {visible.length === 0 && <p className="px-3 py-2 text-black/50 dark:text-white/50">No results found</p>}
            {visible.map((option, index) => {
              const heading = option.group && option.group !== visible[index - 1]?.group ? option.group : null;
              const isSelected = option.value === String(value);

              return (
                <div key={`${option.group ?? ""}-${option.value}-${index}`}>
                  {heading && <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">{heading}</p>}
                  <div
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-active={index === cursor}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => choose(option)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 ${option.group ? "pl-5" : ""} ${
                      index === cursor ? "bg-black text-white dark:bg-white dark:text-black" : ""
                    } ${isSelected && index !== cursor ? "font-semibold" : ""} ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                        <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  label: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  maxLength?: number;
}

/**
 * Accessible, searchable text input backed by a filtered listbox.
 *
 * Deliberately dependency-free: a native `<datalist>` cannot express the
 * dependent brand → model relationship cleanly, and a full menu library is not
 * worth the bundle. Keyboard support follows the WAI-ARIA combobox pattern
 * (ArrowUp/Down to move, Enter to pick, Escape to dismiss). Free text is
 * allowed so a seller is never blocked from describing a car we did not list;
 * the team verifies the value downstream.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
  label,
  required = false,
  invalid = false,
  describedBy,
  maxLength,
}: ComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Fully controlled: the visible value lives in the parent, so changing the
  // make can clear a dependent model without any effect-based syncing.
  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options.slice(0, 40);
    return options.filter((option) => option.toLowerCase().includes(query)).slice(0, 40);
  }, [options, value]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function commit(option: string) {
    onChange(option);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        event.preventDefault();
        commit(filtered[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showList = open && !disabled && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-3 py-2.5 pr-9 text-sm text-[hsl(var(--color-content))] outline-none transition focus:border-[hsl(var(--color-primary))] focus:ring-2 focus:ring-[hsl(var(--color-focus)/0.4)] disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-[hsl(var(--color-error))]"
      />
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-muted))]"
        aria-hidden="true"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] py-1 shadow-lg"
        >
          {filtered.map((option, index) => (
            <li
              key={option}
              id={`${inputId}-option-${index}`}
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => {
                event.preventDefault();
                commit(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === activeIndex
                  ? "bg-[hsl(var(--color-primary))]/12 text-[hsl(var(--color-content))]"
                  : "text-[hsl(var(--color-content-muted))]"
              }`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

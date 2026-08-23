"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function ExpandableSearch({
  value,
  onChange,
  placeholder = "Search",
  alwaysExpanded = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  alwaysExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = alwaysExpanded || expanded || value.trim().length > 0;

  useEffect(() => {
    if (expanded && !alwaysExpanded) inputRef.current?.focus();
  }, [expanded, alwaysExpanded]);

  useEffect(() => {
    if (!isOpen || alwaysExpanded) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        if (!value.trim()) setExpanded(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (value.trim()) onChange("");
        else setExpanded(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onChange, value, alwaysExpanded]);

  return (
    <div
      ref={rootRef}
      className={`flex h-9 items-center overflow-hidden rounded-full border border-border bg-background transition-[width] duration-200 ease-out ${
        isOpen ? "w-64" : "w-9"
      }`}
    >
      {alwaysExpanded ? (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-muted">
          <Search className="h-4 w-4" aria-hidden />
        </span>
      ) : (
        <button
          type="button"
          aria-label={isOpen ? undefined : placeholder}
          aria-expanded={isOpen}
          onClick={() => {
            if (!isOpen) setExpanded(true);
            else inputRef.current?.focus();
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-muted hover:text-foreground"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      )}
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        tabIndex={isOpen ? 0 : -1}
        className={
          isOpen
            ? "min-w-0 flex-1 bg-transparent py-1.5 pr-2 text-sm opacity-100 outline-none"
            : "pointer-events-none w-0 min-w-0 flex-1 bg-transparent py-1.5 pr-2 text-sm opacity-0 outline-none"
        }
      />
      {isOpen && value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

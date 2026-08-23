"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";

export function toggleSortColumn<T extends string>(
  current: T,
  column: T,
  direction: SortDirection,
): { column: T; direction: SortDirection } {
  if (current === column) {
    return { column, direction: direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

export function compareStrings(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
}

export function compareNumbers(a: number, b: number): number {
  return a - b;
}

export function compareDates(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return new Date(a ?? 0).getTime() - new Date(b ?? 0).getTime();
}

export function SortableTableHeader({
  label,
  active,
  direction,
  onSort,
  className = "",
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
  className?: string;
  align?: "left" | "right";
}) {
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ChevronsUpDown;

  return (
    <th className={className}>
      <button
        type="button"
        onClick={onSort}
        aria-sort={
          active ? (direction === "asc" ? "ascending" : "descending") : "none"
        }
        className={`inline-flex items-center gap-1 text-inherit font-medium transition-colors hover:text-foreground ${
          active ? "text-foreground" : "text-muted"
        } ${align === "right" ? "ml-auto" : ""}`}
      >
        <span>{label}</span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${active ? "" : "opacity-40"}`}
          aria-hidden
        />
      </button>
    </th>
  );
}

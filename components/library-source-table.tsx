"use client";

import { useMemo, useState } from "react";
import { SourceRowActions } from "@/components/source-row-actions";
import { SourceTypeIcon } from "@/components/source-type-icon";
import {
  SortableTableHeader,
  compareDates,
  compareStrings,
  toggleSortColumn,
  type SortDirection,
} from "@/components/sortable-table-header";
import {
  sourceTypeDisplay,
  type LibrarySourceRow,
} from "@/lib/workspace/library";
import { TableSeeMore, useTablePagination } from "@/components/table-see-more";

type SourceSortColumn = "type" | "title" | "creator" | "filename" | "modified";

function sortSources(
  sources: LibrarySourceRow[],
  column: SourceSortColumn,
  direction: SortDirection,
): LibrarySourceRow[] {
  const sorted = [...sources].sort((a, b) => {
    let result = 0;
    switch (column) {
      case "type":
        result = compareStrings(
          sourceTypeDisplay(a.source_type),
          sourceTypeDisplay(b.source_type),
        );
        break;
      case "title":
        result = compareStrings(a.title, b.title);
        break;
      case "creator":
        result = compareStrings(a.creator_name, b.creator_name);
        break;
      case "filename":
        result = compareStrings(a.original_filename, b.original_filename);
        break;
      case "modified":
        result = compareDates(a.updated_at, b.updated_at);
        break;
    }
    return direction === "asc" ? result : -result;
  });
  return sorted;
}

export function LibrarySourceTable({
  sources,
  selectedId,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  sources: LibrarySourceRow[];
  selectedId: string | null;
  onSelect: (sourceId: string) => void;
  onDragStart: (sourceId: string) => void;
  onDragEnd: () => void;
}) {
  const [sortColumn, setSortColumn] = useState<SourceSortColumn>("modified");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedSources = useMemo(
    () => sortSources(sources, sortColumn, sortDirection),
    [sources, sortColumn, sortDirection],
  );

  const pagination = useTablePagination(
    sortedSources.length,
    `${sortColumn}:${sortDirection}:${sources.map((source) => source.id).join(",")}`,
  );
  const visibleSources = sortedSources.slice(0, pagination.visibleCount);

  function onSortColumn(column: SourceSortColumn) {
    const next = toggleSortColumn(sortColumn, column, sortDirection);
    setSortColumn(next.column);
    setSortDirection(next.direction);
  }

  if (sources.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center p-8 text-center text-sm text-muted">
        No sources in this catalog.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-surface">
          <tr>
            <SortableTableHeader
              label="Type"
              active={sortColumn === "type"}
              direction={sortDirection}
              onSort={() => onSortColumn("type")}
              className="w-12 px-3 py-2.5 pl-4"
            />
            <SortableTableHeader
              label="Title"
              active={sortColumn === "title"}
              direction={sortDirection}
              onSort={() => onSortColumn("title")}
              className="px-3 py-2.5"
            />
            <SortableTableHeader
              label="Creator"
              active={sortColumn === "creator"}
              direction={sortDirection}
              onSort={() => onSortColumn("creator")}
              className="hidden px-3 py-2.5 sm:table-cell"
            />
            <SortableTableHeader
              label="Filename"
              active={sortColumn === "filename"}
              direction={sortDirection}
              onSort={() => onSortColumn("filename")}
              className="hidden px-3 py-2.5 md:table-cell"
            />
            <SortableTableHeader
              label="Modified"
              active={sortColumn === "modified"}
              direction={sortDirection}
              onSort={() => onSortColumn("modified")}
              className="hidden px-3 py-2.5 lg:table-cell"
            />
            <th className="sticky right-0 w-20 bg-surface px-3 py-2.5 text-right text-sm font-medium text-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleSources.map((source, index) => {
            const active = source.id === selectedId;
            const striped = index % 2 === 1;
            const rowBg = active
              ? "bg-accent/10"
              : striped
                ? "bg-surface-alt hover:bg-hover/60"
                : "bg-surface hover:bg-hover/60";
            const stickyBg = active
              ? "bg-accent/10"
              : striped
                ? "bg-surface-alt group-hover:bg-hover/60"
                : "bg-surface group-hover:bg-hover/60";
            return (
              <tr
                key={source.id}
                draggable
                onDragStart={() => onDragStart(source.id)}
                onDragEnd={onDragEnd}
                onClick={() => onSelect(source.id)}
                className={`group cursor-pointer border-b border-border/60 transition-colors last:border-b-0 ${rowBg}`}
              >
                <td className="px-3 py-2.5 pl-4">
                  <span
                    title={sourceTypeDisplay(source.source_type)}
                    className="inline-flex"
                  >
                    <SourceTypeIcon
                      sourceType={source.source_type}
                      url={source.url}
                      className="h-4 w-4 text-muted"
                    />
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="block min-w-0 truncate font-medium">
                    {source.title}
                  </span>
                </td>
                <td className="hidden max-w-[10rem] truncate px-3 py-2.5 text-muted sm:table-cell">
                  {source.creator_name ?? "—"}
                </td>
                <td className="hidden max-w-[12rem] truncate px-3 py-2.5 text-muted md:table-cell">
                  {source.original_filename?.trim() || "—"}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2.5 text-muted lg:table-cell">
                  {new Date(source.updated_at).toLocaleDateString()}
                </td>
                <td
                  className={`sticky right-0 px-3 py-2.5 text-right ${stickyBg}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <SourceRowActions
                    sourceId={source.id}
                    title={source.title}
                    sourceType={source.source_type}
                    url={source.url}
                    alwaysVisible
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {pagination.hasMore ? (
        <TableSeeMore onShowMore={pagination.showMore} />
      ) : null}
    </div>
  );
}

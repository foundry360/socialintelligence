"use client";

import { SourceRowActions } from "@/components/source-row-actions";
import { SourceTypeIcon } from "@/components/source-type-icon";
import {
  sourceTypeDisplay,
  type LibrarySourceRow,
} from "@/lib/workspace/library";

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
  if (sources.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center p-8 text-center text-sm text-muted">
        No sources in this catalog.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-surface">
          <tr>
            <th className="w-12 px-3 py-2.5 pl-4 font-medium text-muted">Type</th>
            <th className="px-3 py-2.5 font-medium text-muted">Title</th>
            <th className="hidden px-3 py-2.5 font-medium text-muted sm:table-cell">
              Creator
            </th>
            <th className="hidden px-3 py-2.5 font-medium text-muted md:table-cell">
              Filename
            </th>
            <th className="hidden px-3 py-2.5 font-medium text-muted lg:table-cell">
              Modified
            </th>
            <th className="sticky right-0 w-20 bg-surface px-3 py-2.5 text-right font-medium text-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source, index) => {
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
  );
}

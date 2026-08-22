"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { SourceTypeIcon } from "@/components/source-type-icon";
import type { MissionLibrarySourceOption } from "@/app/workspace/missions/actions";
import { UNCATALOGED_ID, type LibraryCatalog } from "@/lib/workspace/library";

type TreeCatalogId = string;

export function LibrarySourcePickerTree({
  sources,
  catalogs,
  query,
  selectedIds,
  onToggle,
  disabled = false,
}: {
  sources: MissionLibrarySourceOption[];
  catalogs: LibraryCatalog[];
  query: string;
  selectedIds: Set<string>;
  onToggle: (sourceId: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<TreeCatalogId>>(() => new Set());

  const filteredSources = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter(
      (source) =>
        source.title.toLowerCase().includes(q) ||
        (source.url ?? "").toLowerCase().includes(q),
    );
  }, [sources, query]);

  const folders = useMemo(
    () => [
      ...catalogs.map((catalog) => ({
        id: catalog.id as TreeCatalogId,
        label: catalog.label,
      })),
      { id: UNCATALOGED_ID, label: "Uncataloged" },
    ],
    [catalogs],
  );

  const grouped = useMemo(() => {
    const map = new Map<TreeCatalogId, MissionLibrarySourceOption[]>();
    map.set(UNCATALOGED_ID, []);
    for (const catalog of catalogs) {
      map.set(catalog.id, []);
    }
    const seenInFolder = new Map<TreeCatalogId, Set<string>>();
    for (const folder of folders) {
      seenInFolder.set(folder.id, new Set());
    }
    for (const source of filteredSources) {
      if (source.catalogs.length === 0) {
        map.get(UNCATALOGED_ID)!.push(source);
        continue;
      }
      for (const catalogSlug of source.catalogs) {
        const bucket = map.get(catalogSlug);
        if (!bucket) continue;
        const seen = seenInFolder.get(catalogSlug)!;
        if (seen.has(source.id)) continue;
        seen.add(source.id);
        bucket.push(source);
      }
    }
    for (const [, rows] of map) {
      rows.sort((a, b) => a.title.localeCompare(b.title));
    }
    return map;
  }, [filteredSources, catalogs, folders]);

  useEffect(() => {
    if (!query.trim()) return;
    const next = new Set<TreeCatalogId>();
    for (const folder of folders) {
      if ((grouped.get(folder.id) ?? []).length > 0) {
        next.add(folder.id);
      }
    }
    setExpanded(next);
  }, [query, folders, grouped]);

  function toggleFolder(id: TreeCatalogId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (sources.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No sources in your library yet. Upload or import a source first.
      </p>
    );
  }

  if (filteredSources.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No sources match your search.
      </p>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-xl border border-border p-2 text-left">
      <div className="flex items-center gap-2 px-2 py-2 text-left text-sm font-medium text-foreground">
        <Folder className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span>All Sources ({filteredSources.length})</span>
      </div>
      <ul className="space-y-1">
        {folders.map((folder) => {
          const rows = grouped.get(folder.id) ?? [];
          if (rows.length === 0) return null;
          const isOpen = expanded.has(folder.id);

          return (
            <li key={folder.id}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  aria-label={
                    isOpen ? `Collapse ${folder.label}` : `Expand ${folder.label}`
                  }
                  className="inline-flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  )}
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-start gap-2 px-2 py-1.5 text-left text-sm">
                  <Folder className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 truncate text-left font-medium">
                    {folder.label} ({rows.length})
                  </span>
                </div>
              </div>

              {isOpen ? (
                <ul className="ml-5 border-l border-border pb-1 pl-2">
                  {rows.map((source) => {
                    const checked = selectedIds.has(source.id);
                    return (
                      <li key={`${folder.id}-${source.id}`}>
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                            source.attached
                              ? "cursor-default opacity-60"
                              : checked
                                ? "bg-accent/10"
                                : "hover:bg-hover"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 shrink-0"
                            checked={source.attached || checked}
                            disabled={source.attached || disabled}
                            onChange={() => onToggle(source.id)}
                          />
                          <SourceTypeIcon
                            sourceType={source.source_type}
                            url={source.url}
                            className="h-4 w-4 shrink-0"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {source.title}
                          </span>
                          {source.attached ? (
                            <span className="shrink-0 text-xs text-muted">
                              Added
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

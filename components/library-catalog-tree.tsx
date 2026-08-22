"use client";

import { useEffect, useId, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Folder, Plus } from "lucide-react";
import {
  addCatalogToSource,
  clearSourceCatalogs,
  createLibraryCatalog,
} from "@/app/workspace/library/actions";
import { SourceTypeIcon } from "@/components/source-type-icon";
import {
  UNCATALOGED_ID,
  type LibraryCatalog,
  type LibrarySourceRow,
} from "@/lib/workspace/library";

export type TreeCatalogFilter = "all" | typeof UNCATALOGED_ID | string;

type TreeCatalogId = string;

export function LibraryCatalogTree({
  sources,
  catalogs,
  selectedCatalogId,
  selectedId,
  onSelectCatalog,
  onSelectSource,
  draggingSourceId,
  onDropOnCatalog,
}: {
  sources: LibrarySourceRow[];
  catalogs: LibraryCatalog[];
  selectedCatalogId: TreeCatalogFilter;
  selectedId: string | null;
  onSelectCatalog: (catalogId: TreeCatalogFilter) => void;
  onSelectSource: (sourceId: string) => void;
  draggingSourceId: string | null;
  onDropOnCatalog: (sourceId: string, catalog: string | null) => void;
}) {
  const [expanded, setExpanded] = useState<Set<TreeCatalogId>>(() => new Set());
  const [internalDraggingId, setInternalDraggingId] = useState<string | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState<TreeCatalogId | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const activeDragId = draggingSourceId ?? internalDraggingId;

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
    const map = new Map<TreeCatalogId, LibrarySourceRow[]>();
    map.set(UNCATALOGED_ID, []);
    for (const catalog of catalogs) {
      map.set(catalog.id, []);
    }
    const seenInFolder = new Map<TreeCatalogId, Set<string>>();
    for (const folder of folders) {
      seenInFolder.set(folder.id, new Set());
    }
    for (const source of sources) {
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
  }, [sources, catalogs, folders]);

  function toggleFolder(id: TreeCatalogId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function catalogValue(id: TreeCatalogId): string | null {
    return id === UNCATALOGED_ID ? null : id;
  }

  function onDropOnFolder(folderId: TreeCatalogId) {
    if (!activeDragId || pending) return;
    const catalog = catalogValue(folderId);
    startTransition(async () => {
      if (catalog) {
        await addCatalogToSource(activeDragId, catalog);
      } else {
        await clearSourceCatalogs(activeDragId);
      }
      onDropOnCatalog(activeDragId, catalog);
    });
    setInternalDraggingId(null);
    setDropTarget(null);
  }

  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelectCatalog("all")}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
            selectedCatalogId === "all"
              ? "bg-accent/15 font-medium text-foreground"
              : "text-foreground hover:bg-hover"
          }`}
        >
          <Folder className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 truncate">
            All sources ({sources.length})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="Add catalog folder"
          title="Add catalog folder"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <ul className="space-y-1">
        {folders.map((folder) => {
            const rows = grouped.get(folder.id) ?? [];
            const isOpen = expanded.has(folder.id);
            const catalogActive = selectedCatalogId === folder.id;
            const isTarget = dropTarget === folder.id && activeDragId != null;

            return (
              <li key={folder.id}>
                <div
                  onDragOver={(event) => {
                    if (!activeDragId) return;
                    event.preventDefault();
                    setDropTarget(folder.id);
                  }}
                  onDragLeave={() => {
                    if (dropTarget === folder.id) setDropTarget(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    onDropOnFolder(folder.id);
                  }}
                  className={`rounded-md ${isTarget ? "bg-accent/10 ring-1 ring-accent/40" : ""}`}
                >
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
                    <button
                      type="button"
                      onClick={() => onSelectCatalog(folder.id)}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors ${
                        catalogActive
                          ? "bg-accent/15 font-medium text-foreground"
                          : "text-foreground hover:bg-hover"
                      }`}
                    >
                      <Folder className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 truncate text-left">
                        {folder.label} ({rows.length})
                      </span>
                    </button>
                  </div>

                  {isOpen ? (
                    <ul className="ml-5 border-l border-border pb-1 pl-2">
                      {rows.length === 0 ? (
                        <li className="px-2 py-2 text-xs text-muted">No sources</li>
                      ) : (
                        rows.map((source) => {
                          const active = source.id === selectedId;
                          const dragging = source.id === activeDragId;
                          return (
                            <li key={source.id}>
                              <button
                                type="button"
                                draggable={!draggingSourceId}
                                onDragStart={() => setInternalDraggingId(source.id)}
                                onDragEnd={() => {
                                  setInternalDraggingId(null);
                                  setDropTarget(null);
                                }}
                                onClick={() => onSelectSource(source.id)}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                                  active
                                    ? "bg-accent/15 text-foreground"
                                    : "text-foreground hover:bg-hover"
                                } ${dragging ? "opacity-50" : ""}`}
                              >
                                <SourceTypeIcon
                                  sourceType={source.source_type}
                                  url={source.url}
                                  className="h-4 w-4 shrink-0"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {source.title}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
        })}
      </ul>

      {createOpen ? (
        <CreateCatalogModal
          onClose={() => setCreateOpen(false)}
          onCreated={(slug) => {
            setCreateOpen(false);
            onSelectCatalog(slug);
            setExpanded((prev) => new Set(prev).add(slug));
          }}
        />
      ) : null}
    </div>
  );
}

function CreateCatalogModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        setError(null);
        const slug = await createLibraryCatalog(name);
        router.refresh();
        onCreated(slug);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create catalog.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-medium text-foreground">
          New catalog folder
        </h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Case studies"
              className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
              autoFocus
              required
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:bg-hover hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              {pending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

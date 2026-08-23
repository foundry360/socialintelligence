"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import {
  LibraryCatalogTree,
  type TreeCatalogFilter,
} from "@/components/library-catalog-tree";
import { LibrarySourceTable } from "@/components/library-source-table";
import {
  addCatalogToSource,
  addTagToSource,
  removeCatalogFromSource,
  removeTagFromSource,
} from "@/app/workspace/library/actions";
import { AddSourceButton } from "@/components/add-source-modal";
import { ExpandableSearch } from "@/components/expandable-search";
import { SourceTypeIcon } from "@/components/source-type-icon";
import {
  catalogLabel,
  formatSourceCatalogs,
  isUncataloged,
  mergeLibraryCatalogs,
  sourceInCatalog,
  sourceTypeDisplay,
  UNCATALOGED_ID,
  type CustomLibraryCatalog,
  type LibraryCatalog,
  type LibrarySourceRow,
  type SourceTag,
} from "@/lib/workspace/library";

function parseCatalogParam(
  value: string | null,
  catalogs: LibraryCatalog[],
): TreeCatalogFilter {
  if (!value || value === "all") return "all";
  if (value === UNCATALOGED_ID) return UNCATALOGED_ID;
  if (catalogs.some((catalog) => catalog.id === value)) {
    return value;
  }
  return "all";
}

export function LibraryPanel({
  sources: initialSources,
  allTags,
  customCatalogs,
}: {
  sources: LibrarySourceRow[];
  allTags: SourceTag[];
  customCatalogs: CustomLibraryCatalog[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogs = useMemo(
    () => mergeLibraryCatalogs(customCatalogs),
    [customCatalogs],
  );
  const selectedId = searchParams.get("source");
  const selectedCatalogId = parseCatalogParam(
    searchParams.get("catalog"),
    catalogs,
  );

  const [sources, setSources] = useState(initialSources);
  const [query, setQuery] = useState("");
  const [draggingSourceId, setDraggingSourceId] = useState<string | null>(null);

  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  const searchFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter(
      (source) =>
        source.title.toLowerCase().includes(q) ||
        (source.summary ?? "").toLowerCase().includes(q) ||
        (source.url ?? "").toLowerCase().includes(q) ||
        (source.original_filename ?? "").toLowerCase().includes(q) ||
        source.tags.some((tag) => tag.name.toLowerCase().includes(q)),
    );
  }, [sources, query]);

  const catalogFiltered = useMemo(() => {
    if (selectedCatalogId === "all") return searchFiltered;
    if (selectedCatalogId === UNCATALOGED_ID) {
      return searchFiltered.filter((source) => isUncataloged(source));
    }
    return searchFiltered.filter((source) =>
      sourceInCatalog(source, selectedCatalogId),
    );
  }, [searchFiltered, selectedCatalogId]);

  const selected =
    sources.find((source) => source.id === selectedId) ??
    catalogFiltered[0] ??
    null;

  function updateParams(
    updates: { source?: string | null; catalog?: TreeCatalogFilter },
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.source !== undefined) {
      if (updates.source) params.set("source", updates.source);
      else params.delete("source");
    }
    if (updates.catalog !== undefined) {
      if (updates.catalog === "all") params.delete("catalog");
      else params.set("catalog", updates.catalog);
    }
    const qs = params.toString();
    router.replace(qs ? `/workspace/library?${qs}` : "/workspace/library", {
      scroll: false,
    });
  }

  function selectSource(id: string) {
    updateParams({ source: id });
  }

  function selectCatalog(catalogId: TreeCatalogFilter) {
    const nextSources =
      catalogId === "all"
        ? searchFiltered
        : catalogId === UNCATALOGED_ID
          ? searchFiltered.filter((source) => isUncataloged(source))
          : searchFiltered.filter((source) => sourceInCatalog(source, catalogId));
    const nextSourceId =
      selectedId && nextSources.some((source) => source.id === selectedId)
        ? selectedId
        : (nextSources[0]?.id ?? null);
    updateParams({ catalog: catalogId, source: nextSourceId });
  }

  function onCatalogsUpdated(
    sourceId: string,
    catalogs: string[],
  ) {
    setSources((prev) =>
      prev.map((source) =>
        source.id === sourceId ? { ...source, catalogs } : source,
      ),
    );
  }

  function onDropOnCatalog(sourceId: string, catalog: string | null) {
    setSources((prev) =>
      prev.map((source) => {
        if (source.id !== sourceId) return source;
        if (!catalog) return { ...source, catalogs: [] };
        if (source.catalogs.includes(catalog)) return source;
        return { ...source, catalogs: [...source.catalogs, catalog] };
      }),
    );
    setDraggingSourceId(null);
  }

  const catalogTitle =
    selectedCatalogId === "all"
      ? "All sources"
      : catalogLabel(
          selectedCatalogId === UNCATALOGED_ID ? null : selectedCatalogId,
          catalogs,
        );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Library</h1>
        <div className="flex shrink-0 items-center justify-end gap-3">
          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search sources"
            alwaysExpanded
          />
          <AddSourceButton variant="pill" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-3 gap-4 overflow-hidden xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,22rem)] xl:grid-rows-1">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Catalogs</p>
            <p className="text-xs text-muted">Drag sources from the table</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <LibraryCatalogTree
              sources={searchFiltered}
              catalogs={catalogs}
              selectedCatalogId={selectedCatalogId}
              selectedId={selected?.id ?? null}
              onSelectCatalog={selectCatalog}
              onSelectSource={selectSource}
              draggingSourceId={draggingSourceId}
              onDropOnCatalog={onDropOnCatalog}
            />
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-medium">{catalogTitle}</p>
            <p className="shrink-0 text-xs text-muted">
              {catalogFiltered.length}{" "}
              {catalogFiltered.length === 1 ? "source" : "sources"}
            </p>
          </div>
          <LibrarySourceTable
            sources={catalogFiltered}
            selectedId={selected?.id ?? null}
            onSelect={selectSource}
            onDragStart={setDraggingSourceId}
            onDragEnd={() => setDraggingSourceId(null)}
          />
        </section>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selected ? (
              <LibrarySourceInspector
                key={selected.id}
                source={selected}
                allTags={allTags}
                catalogs={catalogs}
                onCatalogsUpdated={onCatalogsUpdated}
              />
            ) : (
              <div className="flex h-full min-h-[12rem] items-center justify-center p-8 text-center text-sm text-muted">
                {sources.length === 0
                  ? "Add a source to start building your library."
                  : "Select a source from the table or catalog tree."}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function LibrarySourceInspector({
  source,
  allTags,
  catalogs,
  onCatalogsUpdated,
}: {
  source: LibrarySourceRow;
  allTags: SourceTag[];
  catalogs: LibraryCatalog[];
  onCatalogsUpdated: (sourceId: string, catalogs: string[]) => void;
}) {
  const router = useRouter();
  const [sourceCatalogs, setSourceCatalogs] = useState(source.catalogs);
  const [catalogInput, setCatalogInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(source.tags);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSourceCatalogs(source.catalogs);
    setCatalogInput("");
    setTags(source.tags);
  }, [source]);

  const availableCatalogs = catalogs.filter(
    (catalog) => !sourceCatalogs.includes(catalog.id),
  );

  const viewHref =
    source.source_type === "url" && source.url?.trim()
      ? source.url.trim()
      : `/workspace/library/${source.id}`;

  const viewExternal = source.source_type === "url" && Boolean(source.url?.trim());

  function resolveCatalogInput(raw: string) {
    const value = raw.trim();
    if (!value) return null;
    return (
      catalogs.find((catalog) => catalog.id === value || catalog.label === value) ??
      null
    );
  }

  function onAddCatalog(event: React.FormEvent) {
    event.preventDefault();
    const catalog = resolveCatalogInput(catalogInput);
    if (!catalog || sourceCatalogs.includes(catalog.id)) return;
    const slug = catalog.id;
    startTransition(async () => {
      await addCatalogToSource(source.id, slug);
      const next = [...sourceCatalogs, slug].sort();
      setSourceCatalogs(next);
      onCatalogsUpdated(source.id, next);
      setCatalogInput("");
      router.refresh();
    });
  }

  function onRemoveCatalog(catalogSlug: string) {
    startTransition(async () => {
      await removeCatalogFromSource(source.id, catalogSlug);
      const next = sourceCatalogs.filter((slug) => slug !== catalogSlug);
      setSourceCatalogs(next);
      onCatalogsUpdated(source.id, next);
      router.refresh();
    });
  }

  function onAddTag(event: React.FormEvent) {
    event.preventDefault();
    const name = tagInput.trim();
    if (!name) return;
    startTransition(async () => {
      await addTagToSource(source.id, name);
      setTagInput("");
      router.refresh();
    });
  }

  function onRemoveTag(tagId: string) {
    startTransition(async () => {
      await removeTagFromSource(source.id, tagId);
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      router.refresh();
    });
  }

  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <SourceTypeIcon
          sourceType={source.source_type}
          url={source.url}
          className="mt-0.5 h-7 w-7 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{source.title}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {formatSourceCatalogs(sourceCatalogs, catalogs)} · {source.evidence_status}
          </p>
        </div>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <DetailRow label="Source title" value={source.title} />
        <DetailRow
          label="URL"
          value={
            source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-link underline underline-offset-2"
              >
                {source.url}
              </a>
            ) : (
              "—"
            )
          }
        />
        <DetailRow
          label="Filename"
          value={source.original_filename?.trim() || "—"}
        />
        <DetailRow label="Source type" value={sourceTypeDisplay(source.source_type)} />
        <DetailRow
          label="View source"
          value={
            viewExternal ? (
              <a
                href={viewHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-link underline underline-offset-2"
              >
                Open original
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <Link
                href={`/workspace/library/${source.id}?from=content`}
                className="inline-flex items-center gap-1 text-link underline underline-offset-2"
              >
                View content
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )
          }
        />
        <DetailRow
          label="Uploaded"
          value={new Date(source.created_at).toLocaleString()}
        />
        <DetailRow
          label="Modified"
          value={new Date(source.updated_at).toLocaleString()}
        />
      </dl>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm font-medium">Catalogs</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sourceCatalogs.length === 0 ? (
            <p className="text-sm text-muted">No catalogs yet.</p>
          ) : (
            sourceCatalogs.map((catalogSlug) => (
              <span
                key={catalogSlug}
                className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs text-foreground"
              >
                {catalogLabel(catalogSlug, catalogs)}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRemoveCatalog(catalogSlug)}
                  aria-label={`Remove ${catalogLabel(catalogSlug, catalogs)} catalog`}
                  className="rounded-full p-0.5 text-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <form onSubmit={onAddCatalog} className="mt-3 flex gap-2">
          <input
            value={catalogInput}
            onChange={(event) => setCatalogInput(event.target.value)}
            placeholder={
              availableCatalogs.length === 0
                ? "All catalogs assigned"
                : "Add catalog"
            }
            list="library-catalog-suggestions"
            disabled={pending || availableCatalogs.length === 0}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-muted disabled:opacity-50"
          />
          <datalist id="library-catalog-suggestions">
            {availableCatalogs.map((catalog) => (
              <option key={catalog.id} value={catalog.label} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={pending || !resolveCatalogInput(catalogInput)}
            aria-label="Add catalog"
            title="Add catalog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm font-medium">Tags</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <p className="text-sm text-muted">No tags yet.</p>
          ) : (
            tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs text-foreground"
              >
                {tag.name}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRemoveTag(tag.id)}
                  aria-label={`Remove tag ${tag.name}`}
                  className="rounded-full p-0.5 text-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <form onSubmit={onAddTag} className="mt-3 flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag"
            list="library-tag-suggestions"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-muted"
          />
          <datalist id="library-tag-suggestions">
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.name} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={pending || !tagInput.trim()}
            aria-label="Add tag"
            title="Add tag"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm font-medium">Used in projects</p>
        {source.missions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Not attached to any projects yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {source.missions.map((mission) => (
              <li key={mission.id}>
                <Link
                  href={`/workspace/missions/${mission.id}`}
                  className="text-sm text-link underline underline-offset-2 hover:text-foreground"
                >
                  {mission.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {source.summary ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm font-medium">Summary</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{source.summary}</p>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="min-w-0 text-foreground">{value}</dd>
    </div>
  );
}

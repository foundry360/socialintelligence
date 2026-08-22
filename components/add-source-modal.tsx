"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Library,
  Link2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  addKnowledgeNote,
  addKnowledgeUpload,
  addKnowledgeUrl,
} from "@/app/workspace/actions";
import {
  attachSourcesToMission,
  listLibrarySourcesForMissionAttach,
  type MissionLibraryPickerData,
} from "@/app/workspace/missions/actions";
import { LibrarySourcePickerTree } from "@/components/library-source-picker-tree";

type SourceMode = "upload" | "url" | "note" | "library";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-foreground/10";

const MODES: {
  id: SourceMode;
  label: string;
  description: string;
  icon: typeof Upload;
}[] = [
  {
    id: "upload",
    label: "Upload",
    description: "PDF, TXT, or Markdown",
    icon: Upload,
  },
  {
    id: "url",
    label: "URL",
    description: "Import a web page",
    icon: Link2,
  },
  {
    id: "note",
    label: "Rich text",
    description: "Cut and paste content",
    icon: FileText,
  },
];

const LIBRARY_MODE = {
  id: "library" as const,
  label: "Library",
  description: "Add from My Library",
  icon: Library,
};

function modeOptions(missionId?: string) {
  return missionId ? [...MODES, LIBRARY_MODE] : MODES;
}

export function AddSourceButton({
  variant = "icon",
  missionId,
}: {
  variant?: "icon" | "pill";
  missionId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground hover:brightness-95"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add sources
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Add source"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted hover:bg-hover hover:text-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      )}
      {open ? (
        <AddSourceModal
          onClose={() => setOpen(false)}
          missionId={missionId}
        />
      ) : null}
    </>
  );
}

function AddSourceModal({
  onClose,
  missionId,
}: {
  onClose: () => void;
  missionId?: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SourceMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [libraryPicker, setLibraryPicker] = useState<MissionLibraryPickerData>({
    sources: [],
    catalogs: [],
  });
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(
    () => new Set(),
  );

  const modes = modeOptions(missionId);
  const librarySources = libraryPicker.sources;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (mode !== "library" || !missionId) return;
    let cancelled = false;
    setLibraryLoading(true);
    setError(null);
    listLibrarySourcesForMissionAttach(missionId)
      .then((data) => {
        if (!cancelled) setLibraryPicker(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load library.");
        }
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, missionId]);

  const selectableLibraryCount = librarySources.filter(
    (source) => !source.attached,
  ).length;

  function toggleLibrarySource(sourceId: string) {
    const source = librarySources.find((item) => item.id === sourceId);
    if (source?.attached) return;
    setSelectedLibraryIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  function takeFile(next: File | null) {
    setFile(next);
    setError(null);
  }

  function finish() {
    setFile(null);
    setError(null);
    onClose();
    router.refresh();
  }

  async function linkToMission(sourceId: string) {
    if (missionId) {
      await attachSourcesToMission(missionId, [sourceId]);
    }
  }

  function onLibrarySubmit() {
    if (!missionId || selectedLibraryIds.size === 0) return;
    const sourceIds = [...selectedLibraryIds].filter((sourceId) => {
      const source = librarySources.find((item) => item.id === sourceId);
      return source && !source.attached;
    });
    if (sourceIds.length === 0) return;
    startTransition(async () => {
      try {
        setError(null);
        await attachSourcesToMission(missionId, sourceIds);
        finish();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add library sources.",
        );
      }
    });
  }

  function onUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("file", file);
    fd.set("evidence_status", "accepted");
    startTransition(async () => {
      try {
        setError(null);
        const sourceId = await addKnowledgeUpload(fd);
        await linkToMission(sourceId);
        finish();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function onUrlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    fd.set("evidence_status", "accepted");
    startTransition(async () => {
      try {
        setError(null);
        const sourceId = await addKnowledgeUrl(fd);
        await linkToMission(sourceId);
        finish();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  function onNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    fd.set("evidence_status", "accepted");
    startTransition(async () => {
      try {
        setError(null);
        const sourceId = await addKnowledgeNote(fd);
        await linkToMission(sourceId);
        finish();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5 text-left sm:px-8">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-left text-xl font-semibold tracking-tight text-foreground"
            >
              Add source
            </h2>
            <p className="mt-1 text-left text-sm text-muted">
              {mode === "library"
                ? "Choose existing sources from your library to add to this project."
                : missionId
                  ? "Upload, import, paste, or pick from your library."
                  : "Upload a document, import a URL, or paste text."}
              {mode !== "library" && missionId
                ? " New sources are saved to your library and added to this project."
                : mode !== "library" && !missionId
                  ? " Accepted sources show up in Chat right away."
                  : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:bg-hover hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="shrink-0 border-b border-border px-6 py-4 sm:px-8">
          <div
            role="tablist"
            aria-label="Source type"
            className={`grid grid-cols-1 gap-2 ${
              modes.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
            }`}
          >
            {modes.map((item) => {
              const active = mode === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setMode(item.id);
                    setError(null);
                    if (item.id !== "library") setSelectedLibraryIds(new Set());
                  }}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-foreground bg-subtle"
                      : "border-border hover:border-foreground/30 hover:bg-hover"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-foreground/20 bg-surface text-foreground"
                        : "border-border text-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {error ? (
            <p className="mb-4 rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-text">
              {error}
            </p>
          ) : null}

          {mode === "library" ? (
            <div className="grid gap-4">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder="Search library sources"
                  className="w-full rounded-lg border border-border bg-input py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/10"
                />
              </label>

              {libraryLoading ? (
                <p className="py-8 text-center text-sm text-muted">
                  Loading library…
                </p>
              ) : (
                <LibrarySourcePickerTree
                  sources={librarySources}
                  catalogs={libraryPicker.catalogs}
                  query={libraryQuery}
                  selectedIds={selectedLibraryIds}
                  onToggle={toggleLibrarySource}
                  disabled={pending}
                />
              )}

              {selectableLibraryCount > 0 ? (
                <p className="text-xs text-muted">
                  {selectedLibraryIds.size} of {selectableLibraryCount} available
                  source{selectableLibraryCount === 1 ? "" : "s"} selected
                </p>
              ) : null}
            </div>
          ) : null}

          {mode === "upload" ? (
            <form
              id="add-source-form"
              onSubmit={onUploadSubmit}
              className="grid gap-5"
            >
              <input type="hidden" name="sensitivity" value="internal" />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const next = e.dataTransfer.files?.[0] ?? null;
                  takeFile(next);
                }}
                className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragOver
                    ? "border-foreground bg-hover"
                    : file
                      ? "border-foreground/40 bg-subtle"
                      : "border-border bg-subtle/60 hover:border-foreground/35 hover:bg-subtle"
                }`}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-foreground">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-4 text-base font-medium text-foreground">
                  Drop a file
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  or click to browse. PDF, TXT, or Markdown up to 10MB.
                </p>
                {file ? (
                  <p className="mt-4 max-w-full truncate rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground">
                    {file.name}
                  </p>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                className="sr-only"
                onChange={(e) => takeFile(e.target.files?.[0] ?? null)}
              />
              <label className="text-sm font-medium text-foreground">
                Title (optional)
                <input name="title" className={inputClass} />
              </label>
            </form>
          ) : null}

          {mode === "url" ? (
            <form
              id="add-source-form"
              onSubmit={onUrlSubmit}
              className="grid gap-5"
            >
              <input type="hidden" name="sensitivity" value="public" />
              <label className="text-sm font-medium text-foreground">
                URL
                <input
                  name="url"
                  type="url"
                  placeholder="https://www.konakaicorp.com"
                  className={inputClass}
                  required
                />
              </label>
              <label className="text-sm font-medium text-foreground">
                Title (optional)
                <input name="title" className={inputClass} />
              </label>
              <p className="text-sm text-muted">
                Best for company sites and public pages. JavaScript-only apps
                may return little content.
              </p>
            </form>
          ) : null}

          {mode === "note" ? (
            <form
              id="add-source-form"
              onSubmit={onNoteSubmit}
              className="grid gap-5"
            >
              <input type="hidden" name="sensitivity" value="internal" />
              <label className="text-sm font-medium text-foreground">
                Title
                <input name="title" className={inputClass} required />
              </label>
              <label className="text-sm font-medium text-foreground">
                Paste content
                <textarea
                  name="body"
                  rows={14}
                  placeholder="Paste or type source text…"
                  className={`${inputClass} min-h-64 resize-y`}
                  required
                />
              </label>
            </form>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-subtle/40 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:bg-hover hover:text-foreground"
          >
            Cancel
          </button>
          {mode === "library" ? (
            <button
              type="button"
              onClick={onLibrarySubmit}
              disabled={pending || selectedLibraryIds.size === 0}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              {pending
                ? "Adding…"
                : selectedLibraryIds.size > 0
                  ? `Add ${selectedLibraryIds.size} source${
                      selectedLibraryIds.size === 1 ? "" : "s"
                    }`
                  : "Add to project"}
            </button>
          ) : (
            <button
              type="submit"
              form="add-source-form"
              disabled={pending || (mode === "upload" && !file)}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              {pending
                ? mode === "upload"
                  ? "Uploading…"
                  : mode === "url"
                    ? "Importing…"
                    : "Saving…"
                : mode === "upload"
                  ? "Upload & Extract"
                  : mode === "url"
                    ? "Import URL"
                    : "Save source"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

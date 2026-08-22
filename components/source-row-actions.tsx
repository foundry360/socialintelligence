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
import { MoreVertical } from "lucide-react";
import {
  removeKnowledgeSource,
  renameKnowledgeSource,
} from "@/app/workspace/actions";

export function SourceRowActions({
  sourceId,
  title,
  sourceType,
  url,
}: {
  sourceId: string;
  title: string;
  sourceType: string;
  url?: string | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function onView() {
    setMenuOpen(false);
    if (sourceType === "url" && url?.trim()) {
      window.open(url.trim(), "_blank", "noopener,noreferrer");
      return;
    }
    window.open(
      `/workspace/sources/${sourceId}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Source actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-hover hover:text-foreground focus-visible:opacity-100 data-[open=true]:opacity-100"
        data-open={menuOpen || undefined}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 min-w-[8.5rem] rounded-lg border border-border bg-surface py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-hover"
            onClick={onView}
          >
            View
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-hover"
            onClick={() => {
              setMenuOpen(false);
              setRenameOpen(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-hover"
            onClick={() => {
              setMenuOpen(false);
              setRemoveOpen(true);
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      {renameOpen ? (
        <RenameSourceModal
          sourceId={sourceId}
          initialTitle={title}
          onClose={() => setRenameOpen(false)}
          onSaved={() => {
            setRenameOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      {removeOpen ? (
        <RemoveSourceModal
          sourceId={sourceId}
          title={title}
          onClose={() => setRemoveOpen(false)}
          onRemoved={() => {
            setRemoveOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function RenameSourceModal({
  sourceId,
  initialTitle,
  onClose,
  onSaved,
}: {
  sourceId: string;
  initialTitle: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [name, setName] = useState(initialTitle);
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
        await renameKnowledgeSource(sourceId, name);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rename failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-medium text-foreground">
          Rename {initialTitle}?
        </h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RemoveSourceModal({
  sourceId,
  title,
  onClose,
  onRemoved,
}: {
  sourceId: string;
  title: string;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const titleId = useId();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function onDelete() {
    startTransition(async () => {
      try {
        setError(null);
        await removeKnowledgeSource(sourceId);
        onRemoved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Remove failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-medium text-foreground">
          Remove source
        </h2>
        <p className="mt-2 text-sm text-muted">
          Remove{" "}
          <span className="font-medium text-foreground">{title}</span> from
          your knowledge library? This cannot be undone from Chat.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I understand this source will be removed.</span>
        </label>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:bg-hover hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!confirmed || pending}
            className="rounded-full bg-danger px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

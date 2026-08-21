"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Check,
  Copy,
  Globe,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { addKnowledgeNote } from "@/app/workspace/actions";

function suggestTitle(content: string): string {
  const line =
    content
      .replace(/\*\*/g, "")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "Chat note";
  return line.length > 72 ? `${line.slice(0, 69)}…` : line;
}

function runFormat(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function SaveToNoteButton({
  content,
}: {
  content: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-hover"
        >
          <Globe className="h-3.5 w-3.5" aria-hidden />
          Save to source
        </button>
        <button
          type="button"
          onClick={() => void copyToClipboard()}
          aria-label={copied ? "Copied" : "Copy response"}
          title={copied ? "Copied" : "Copy"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-hover"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      </div>
      {open ? (
        <SaveToNoteModal
          initialContent={content}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}

function SaveToNoteModal({
  initialContent,
  onClose,
}: {
  initialContent: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(() => suggestTitle(initialContent));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    const el = editorRef.current;
    if (!el) return;
    el.innerText = initialContent;
  }, [initialContent]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body = editorRef.current?.innerText?.trim() ?? "";
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!body) {
      setError("Note is empty.");
      return;
    }

    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("body", body);
    fd.set("sensitivity", "internal");
    fd.set("evidence_status", "accepted");

    startTransition(async () => {
      try {
        setError(null);
        await addKnowledgeNote(fd);
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-medium text-foreground">
              Save to note
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Saved notes become accepted sources available in Chat.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-hover hover:text-foreground"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <label className="block text-sm font-medium text-foreground">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                required
              />
            </label>

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Note</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="flex flex-wrap gap-0.5 border-b border-border bg-subtle px-1.5 py-1">
                  <ToolbarButton
                    label="Bold"
                    onClick={() => runFormat("bold")}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton
                    label="Italic"
                    onClick={() => runFormat("italic")}
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton
                    label="Underline"
                    onClick={() => runFormat("underline")}
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <span className="mx-1 w-px self-stretch bg-border" />
                  <ToolbarButton
                    label="Bullet list"
                    onClick={() => runFormat("insertUnorderedList")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton
                    label="Numbered list"
                    onClick={() => runFormat("insertOrderedList")}
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </ToolbarButton>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Note"
                  className="min-h-64 max-h-[40vh] overflow-y-auto bg-input px-3.5 py-3 text-sm leading-6 text-foreground outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                  suppressContentEditableWarning
                />
              </div>
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:bg-hover hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[#99C8FF] px-5 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save as source"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

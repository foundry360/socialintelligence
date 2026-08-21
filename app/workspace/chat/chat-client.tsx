"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  BookOpenCheck,
  File,
  Globe,
  GlobeCheck,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SendHorizontal,
  SquareText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatResult } from "@/app/workspace/actions";
import { AddSourceButton } from "@/components/add-source-modal";
import { SaveToNoteButton } from "@/components/save-to-note-modal";
import { SourceRowActions } from "@/components/source-row-actions";

export type ChatSourceOption = {
  id: string;
  title: string;
  sourceType: string;
  url?: string | null;
  originalFilename?: string | null;
};

type Citation = NonNullable<ChatResult["evidence"]>[number] & {
  excerpt?: string;
};

type ThreadMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  evidence?: Citation[];
};

function uniqueSources(citations: Citation[]) {
  const order: string[] = [];
  const byId = new Map<
    string,
    { title: string; url: string | null; sourceType: string }
  >();
  for (const c of citations) {
    if (byId.has(c.sourceId)) continue;
    order.push(c.sourceId);
    byId.set(c.sourceId, {
      title: c.sourceTitle,
      url: c.sourceUrl?.trim() || null,
      sourceType: c.sourceType || (c.sourceUrl ? "url" : "note"),
    });
  }
  return order.map((id) => ({ sourceId: id, ...byId.get(id)! }));
}

function sourceMeta(s: ChatSourceOption): string {
  if (s.sourceType === "url" && s.url) return s.url;
  if (s.originalFilename) return s.originalFilename;
  return s.sourceType;
}

function sourceTypeLabel(sourceType: string): "WEB" | "DOC" | "TEXT" {
  if (sourceType === "url") return "WEB";
  if (sourceType === "note") return "TEXT";
  return "DOC";
}

function sourceDisplayTitle(title: string, sourceType: string): string {
  return `${sourceTypeLabel(sourceType)} - ${title}`;
}

function SourceTypeIcon({
  sourceType,
  className = "mt-0.5 h-4 w-4 shrink-0 text-muted",
}: {
  sourceType: string;
  className?: string;
}) {
  if (sourceType === "url") {
    return <GlobeCheck className={className} aria-hidden />;
  }
  if (sourceType === "note") {
    return <SquareText className={className} aria-hidden />;
  }
  return <File className={className} aria-hidden />;
}

function CitationMark({
  n,
  citation,
}: {
  n: string;
  citation: Citation | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function show() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleHide() {
    if (pinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 400);
  }

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  useEffect(() => {
    if (!pinned) return;
    function onDocPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setPinned(false);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [pinned]);

  if (!citation) {
    return (
      <span className="ml-0.5 align-super text-[0.7em] font-medium text-muted">
        [{n}]
      </span>
    );
  }

  return (
    <span
      ref={rootRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
    >
      <button
        type="button"
        className="ml-0.5 align-super text-[0.7em] font-medium text-muted underline decoration-border underline-offset-2 hover:text-foreground"
        aria-expanded={open}
        aria-controls={`cite-tip-${n}`}
        onClick={(e) => {
          e.preventDefault();
          clearCloseTimer();
          setPinned((wasPinned) => {
            const next = !wasPinned;
            setOpen(next);
            return next;
          });
        }}
      >
        [{n}]
      </button>
      {open ? (
        <span
          id={`cite-tip-${n}`}
          role="dialog"
          className="absolute bottom-full left-1/2 z-30 flex w-80 -translate-x-1/2 flex-col"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
        >
          <span className="rounded-md border border-border bg-surface p-3 text-left text-xs font-normal normal-case tracking-normal text-foreground/80 shadow-lg">
            <span className="block font-medium text-foreground">
              {citation.sourceTitle}
            </span>
            {citation.sourceUrl ? (
              <a
                href={citation.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-link underline"
                onClick={(e) => e.stopPropagation()}
              >
                {citation.sourceUrl}
              </a>
            ) : null}
            {citation.excerpt ? (
              <span
                className="mt-2 block max-h-48 overflow-y-auto overscroll-contain whitespace-pre-wrap leading-5 text-muted"
                onWheel={(e) => e.stopPropagation()}
              >
                {citation.excerpt}
              </span>
            ) : null}
            <span className="mt-2 block text-[10px] text-muted">
              {pinned ? "Click citation again to close" : "Click citation to pin"}
            </span>
          </span>
          <span className="block h-3 w-full" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

function textWithCitations(
  children: ReactNode,
  byIndex: Map<number, Citation>,
): ReactNode {
  if (typeof children === "string") {
    const parts = children.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = /^\[(\d+)\]$/.exec(part);
      if (!match) return <span key={i}>{part}</span>;
      return (
        <CitationMark
          key={i}
          n={match[1]}
          citation={byIndex.get(Number(match[1]))}
        />
      );
    });
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <span key={i}>{textWithCitations(child, byIndex)}</span>
    ));
  }
  return children;
}

function AnswerMarkdown({
  text,
  byIndex,
}: {
  text: string;
  byIndex: Map<number, Citation>;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">{textWithCitations(children, byIndex)}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{textWithCitations(children, byIndex)}</li>,
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto last:mb-0">
            <table className="w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border bg-subtle">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1.5 font-medium text-foreground">
            {textWithCitations(children, byIndex)}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-t border-border px-2 py-1.5 align-top">
            {textWithCitations(children, byIndex)}
          </td>
        ),
        a: ({ children }) => <>{children}</>,
        h1: ({ children }) => (
          <p className="mb-3 font-medium">{textWithCitations(children, byIndex)}</p>
        ),
        h2: ({ children }) => (
          <p className="mb-3 font-medium">{textWithCitations(children, byIndex)}</p>
        ),
        h3: ({ children }) => (
          <p className="mb-3 font-medium">{textWithCitations(children, byIndex)}</p>
        ),
        code: ({ children }) => <>{children}</>,
        pre: ({ children }) => (
          <p className="mb-3 whitespace-pre-wrap">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">
            {textWithCitations(children, byIndex)}
          </strong>
        ),
        em: ({ children }) => <>{children}</>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function TypewriterAnswer({
  text,
  byIndex,
  animate,
  onTick,
  onComplete,
}: {
  text: string;
  byIndex: Map<number, Citation>;
  animate: boolean;
  onTick?: () => void;
  onComplete?: () => void;
}) {
  const [visibleLen, setVisibleLen] = useState(animate ? 0 : text.length);
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  onTickRef.current = onTick;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!animate) {
      setVisibleLen(text.length);
      return;
    }

    setVisibleLen(0);
    let i = 0;
    const step = Math.max(2, Math.ceil(text.length / 400));
    const id = window.setInterval(() => {
      i = Math.min(text.length, i + step);
      setVisibleLen(i);
      onTickRef.current?.();
      if (i >= text.length) {
        window.clearInterval(id);
        onCompleteRef.current?.();
      }
    }, 16);

    return () => window.clearInterval(id);
  }, [text, animate]);

  const done = visibleLen >= text.length;

  return (
    <div className="relative">
      <AnswerMarkdown text={text.slice(0, visibleLen)} byIndex={byIndex} />
      {animate && !done ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-middle"
        />
      ) : null}
    </div>
  );
}

function ChatComposer({
  question,
  setQuestion,
  questionRef,
  onSubmit,
  pending,
  selectedCount,
  placeholder,
  inputId,
}: {
  question: string;
  setQuestion: (value: string) => void;
  questionRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
  selectedCount: number;
  placeholder: string;
  inputId: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-end gap-1 rounded-md border border-border bg-input pl-3 pr-1">
        <label htmlFor={inputId} className="sr-only">
          Message
        </label>
        <textarea
          ref={questionRef}
          id={inputId}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!pending && selectedCount > 0 && question.trim()) {
                e.currentTarget.form?.requestSubmit();
              }
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="min-h-11 flex-1 resize-none overflow-hidden bg-transparent py-3 text-left text-sm leading-5 text-foreground placeholder:text-left placeholder:text-muted/50 focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={pending || selectedCount === 0 || !question.trim()}
          aria-label={pending ? "Thinking" : "Send"}
          className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:text-foreground disabled:opacity-40"
        >
          {pending ? (
            <span className="h-4 w-4 animate-pulse rounded-full bg-muted" />
          ) : (
            <SendHorizontal className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
    </form>
  );
}

export function KnowledgeChat({ sources }: { sources: ChatSourceOption[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(sources.map((s) => s.id)),
  );
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [citationsCollapsed, setCitationsCollapsed] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const scrollThreadToEnd = () => {
    threadEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  };

  useEffect(() => {
    setSelectedIds(new Set(sources.map((s) => s.id)));
  }, [sources]);

  useEffect(() => {
    const el = questionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  useEffect(() => {
    scrollThreadToEnd();
  }, [messages, pending, typingId]);

  function toggleSource(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(sources.map((s) => s.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function clearThread() {
    setMessages([]);
    setError(null);
    setTypingId(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || pending || selectedIds.size === 0) return;

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: ThreadMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/knowledge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          sourceIds: [...selectedIds],
          history,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Chat failed (${res.status})`);
      }
      const next = (await res.json()) as ChatResult;
      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: next.answer,
          citations: next.citations as Citation[],
          evidence: (next.evidence ?? next.citations) as Citation[],
        },
      ]);
      setTypingId(assistantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setQuestion(text);
    } finally {
      setPending(false);
    }
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  const citedSources = lastAssistant
    ? uniqueSources(lastAssistant.citations ?? [])
    : [];

  const selectedCount = selectedIds.size;

  const gridCols = sourcesCollapsed
    ? citationsCollapsed
      ? "xl:grid-cols-[3.25rem_minmax(0,1fr)_3.25rem]"
      : "xl:grid-cols-[3.25rem_minmax(0,1fr)_1fr]"
    : citationsCollapsed
      ? "xl:grid-cols-[1fr_minmax(0,2fr)_3.25rem]"
      : "xl:grid-cols-[1fr_2fr_1fr]";

  return (
    <div
      className={`grid h-full min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 sm:p-6 xl:items-stretch ${gridCols}`}
    >
      {/* Column 1 — Sources */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface xl:h-full">
        {sourcesCollapsed ? (
          <div className="flex h-full flex-col items-center justify-end p-2">
            <button
              type="button"
              onClick={() => setSourcesCollapsed(false)}
              aria-label="Expand sources"
              title="Expand sources"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-base font-medium">Sources</h2>
              <AddSourceButton />
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs">
              <p className="text-muted">{selectedCount} selected</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-muted hover:text-foreground"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-muted hover:text-foreground"
                >
                  None
                </button>
              </div>
            </div>

            {sources.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <Globe className="h-8 w-8 text-muted" aria-hidden />
                <div className="max-w-[16rem] space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Build your knowledge foundation.
                  </p>
                  <p className="text-sm text-muted">
                    Add sources to help your AI understand your business,
                    market, and expertise.
                  </p>
                </div>
                <AddSourceButton variant="pill" />
              </div>
            ) : (
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                {sources.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <li key={s.id} className="group">
                      <div className="flex items-start gap-2 rounded-md p-2 hover:bg-hover">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                          <SourceTypeIcon sourceType={s.sourceType} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-foreground">
                              {sourceDisplayTitle(s.title, s.sourceType)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted">
                              {sourceMeta(s)}
                            </span>
                          </span>
                        </label>
                        <SourceRowActions
                          sourceId={s.id}
                          title={s.title}
                          sourceType={s.sourceType}
                          url={s.url}
                        />
                        <input
                          type="checkbox"
                          className="mt-0.5 size-[16px] shrink-0 accent-[#99C8FF]"
                          checked={checked}
                          onChange={() => toggleSource(s.id)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex shrink-0 justify-end p-2">
              <button
                type="button"
                onClick={() => setSourcesCollapsed(true)}
                aria-label="Collapse sources"
                title="Collapse sources"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
              >
                <PanelLeftClose className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Column 2 — Thread + composer */}
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface xl:h-full">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-medium">Chat</h2>
            {messages.length > 0 ? (
              <p className="text-xs text-muted">
                {messages.filter((m) => m.role === "user").length} messages
              </p>
            ) : null}
          </div>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={clearThread}
              className="text-xs text-muted hover:text-foreground"
            >
              New chat
            </button>
          ) : null}
        </div>

        {messages.length === 0 && !pending ? (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="w-full max-w-xl text-center">
                <p className="text-xs tracking-wide text-muted">
                  Social Intelligence
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  What should we explore?
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Ask grounded questions across your selected sources. Follow-ups
                  stay in this thread.
                </p>
                <div className="mt-8 text-left">
                  <ChatComposer
                    question={question}
                    setQuestion={setQuestion}
                    questionRef={questionRef}
                    onSubmit={onSubmit}
                    pending={pending}
                    selectedCount={selectedCount}
                    placeholder="Ask about your knowledge…"
                    inputId="chat-question-start"
                  />
                </div>
                {error ? (
                  <p className="mt-3 text-left text-sm text-danger">{error}</p>
                ) : null}
              </div>
            </div>
            <p className="shrink-0 pt-4 text-center text-xs text-muted">
              Powered by Foundry360 Synthetic Intelligence
            </p>
          </div>
        ) : (
          <>
            <div className="scrollbar-thread min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((m) => {
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex w-full justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#99C8FF] px-3.5 py-2.5 text-left text-sm leading-5 text-zinc-900">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                const msgIndex = new Map<number, Citation>();
                for (const c of m.evidence ?? []) {
                  if (c.index != null) msgIndex.set(c.index, c);
                }
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="max-w-[90%] space-y-2 text-sm leading-5 text-foreground">
                      <TypewriterAnswer
                        text={m.content}
                        byIndex={msgIndex}
                        animate={m.id === typingId}
                        onTick={scrollThreadToEnd}
                        onComplete={() =>
                          setTypingId((id) => (id === m.id ? null : id))
                        }
                      />
                      {m.id !== typingId ? (
                        <SaveToNoteButton content={m.content} />
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {pending ? (
                <div className="flex justify-start">
                  <p className="text-sm text-muted">Thinking…</p>
                </div>
              ) : null}

              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div ref={threadEndRef} />
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <ChatComposer
                question={question}
                setQuestion={setQuestion}
                questionRef={questionRef}
                onSubmit={onSubmit}
                pending={pending}
                selectedCount={selectedCount}
                placeholder="Continue the conversation…"
                inputId="chat-question"
              />
            </div>
          </>
        )}
      </section>

      {/* Column 3 — Citations for latest answer */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface xl:h-full">
        {citationsCollapsed ? (
          <div className="flex h-full flex-col items-center justify-end p-2">
            <button
              type="button"
              onClick={() => setCitationsCollapsed(false)}
              aria-label="Expand citations"
              title="Expand citations"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-medium">Citations</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              {citedSources.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
                  <BookOpenCheck
                    className="h-8 w-8 text-muted"
                    aria-hidden
                  />
                  <p className="text-sm text-muted">
                    Citation details will appear here when available.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4 text-sm">
                  {citedSources.map((s) => (
                    <li key={s.sourceId} className="flex items-start gap-2">
                      <SourceTypeIcon sourceType={s.sourceType} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {sourceDisplayTitle(s.title, s.sourceType)}
                        </p>
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-xs text-link underline underline-offset-2"
                          >
                            {s.url}
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 justify-end p-2">
              <button
                type="button"
                onClick={() => setCitationsCollapsed(true)}
                aria-label="Collapse citations"
                title="Collapse citations"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground"
              >
                <PanelRightClose className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

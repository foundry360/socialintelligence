"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import {
  approveAuthorityBaseline,
  generateAuthorityBaseline,
  rejectAuthorityBaseline,
} from "@/app/workspace/baseline/actions";
import type { BaselineListItem } from "@/lib/workspace/baseline";

type SourceRef = { id: string; title: string };

function statusLabel(status: BaselineListItem["rawStatus"]): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "awaiting_approval":
      return "Awaiting approval";
    case "draft":
      return "Draft";
    case "rejected":
      return "Rejected";
    case "superseded":
      return "Superseded";
    default:
      return status;
  }
}

function statusClass(status: BaselineListItem["rawStatus"]): string {
  switch (status) {
    case "approved":
      return "bg-accent/15 text-accent";
    case "awaiting_approval":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "rejected":
    case "superseded":
      return "bg-muted/30 text-muted";
    default:
      return "bg-muted/20 text-muted";
  }
}

function BaselineSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground/90">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

function BaselineDetail({
  baseline,
  sourcesById,
  canEdit,
}: {
  baseline: BaselineListItem;
  sourcesById: Map<string, SourceRef>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const citations = baseline.citationSourceIds
    .map((id) => sourcesById.get(id))
    .filter((s): s is SourceRef => Boolean(s));

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Version {baseline.version}</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(baseline.rawStatus)}`}
            >
              {statusLabel(baseline.rawStatus)}
            </span>
          </div>
          {baseline.approvedAt ? (
            <p className="mt-1 text-xs text-muted">
              Approved {new Date(baseline.approvedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
        {canEdit && baseline.rawStatus === "awaiting_approval" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approveAuthorityBaseline(baseline.id))}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => rejectAuthorityBaseline(baseline.id))}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
            >
              <X className="h-4 w-4" aria-hidden />
              Reject
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold">Summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          {baseline.summary || "No summary provided."}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BaselineSection
          title="Strengths"
          items={baseline.strengths}
          empty="No strengths listed."
        />
        <BaselineSection
          title="Weaknesses"
          items={baseline.weaknesses}
          empty="No weaknesses listed."
        />
      </div>

      <BaselineSection title="Gaps" items={baseline.gaps} empty="No gaps listed." />

      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold">POV coverage</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {baseline.povCoverageNotes || "No POV coverage notes."}
        </p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold">Trust mix</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {baseline.trustMixNotes || "No trust mix notes."}
        </p>
      </section>

      <BaselineSection
        title="Recommended actions"
        items={baseline.recommendedActions}
        empty="No recommended actions."
      />

      {citations.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold">Cited sources</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {citations.map((source) => (
              <li key={source.id}>
                <Link
                  href={`/workspace/library?source=${source.id}`}
                  className="text-accent hover:underline"
                >
                  {source.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export function BaselinePanel({
  baselines,
  sources,
  canEdit,
  foundationReady,
  selectedId,
}: {
  baselines: BaselineListItem[];
  sources: SourceRef[];
  canEdit: boolean;
  foundationReady: boolean;
  selectedId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sourcesById = new Map(sources.map((s) => [s.id, s] as const));
  const approved = baselines.find((b) => b.rawStatus === "approved") ?? null;
  const selected =
    baselines.find((b) => b.id === selectedId) ??
    baselines.find((b) => b.rawStatus === "awaiting_approval") ??
    approved ??
    baselines[0] ??
    null;

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await generateAuthorityBaseline();
        router.push(`/workspace/baseline?id=${id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          {approved
            ? "An approved baseline is active. Generate a new version when knowledge or evidence changes materially."
            : foundationReady
              ? "Generate a baseline from structured knowledge and accepted library sources, then approve it before messaging plan work."
              : "Complete structured knowledge and accept evidence sources before generating a baseline."}
        </p>
        {canEdit ? (
          <button
            type="button"
            disabled={!foundationReady || pending}
            onClick={generate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
            {pending ? "Generating…" : "Generate draft"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {baselines.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {baselines.map((b) => {
            const active = selected?.id === b.id;
            return (
              <Link
                key={b.id}
                href={`/workspace/baseline?id=${b.id}`}
                className={
                  active
                    ? "rounded-full border border-accent bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                    : "rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent/40 hover:text-foreground"
                }
              >
                v{b.version} · {statusLabel(b.rawStatus)}
              </Link>
            );
          })}
        </div>
      ) : null}

      {selected ? (
        <BaselineDetail
          baseline={selected}
          sourcesById={sourcesById}
          canEdit={canEdit}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {foundationReady
              ? "No baseline yet. Generate your first draft to begin Phase 3."
              : "Finish the knowledge foundation on Overview, then return here."}
          </p>
          {!foundationReady ? (
            <Link
              href="/workspace/overview"
              className="mt-4 inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent/40"
            >
              Open overview
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

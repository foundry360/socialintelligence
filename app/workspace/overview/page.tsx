import Link from "next/link";
import { Check } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/db/supabase";

type SpineItem = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
};

export default async function WorkspaceOverviewPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Workspace</h1>
        <p className="mt-4 text-muted">Configure Supabase env vars first.</p>
      </main>
    );
  }

  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const [
    { data: profile },
    { count: industryCount },
    { count: capabilityCount },
    { count: personaCount },
    { count: questionCount },
    { count: povCount },
    { count: proofCount },
    { count: termCount },
    { count: sourceCount },
    { count: acceptedCount },
    { data: approvedBaseline },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("legal_name, display_name, summary, positioning")
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("industries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("capabilities")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("personas")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("market_questions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("points_of_view")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("proof_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("terminology_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("knowledge_sources")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
    supabase
      .from("knowledge_sources")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("evidence_status", "accepted")
      .is("deleted_at", null),
    supabase
      .from("authority_baselines")
      .select("id, version, approved_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "approved")
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const profileDone = Boolean(
    profile?.display_name?.trim() &&
      profile?.legal_name?.trim() &&
      (profile?.summary?.trim() || profile?.positioning?.trim()),
  );

  const spine: SpineItem[] = [
    {
      id: "profile",
      label: "Company Profile",
      done: profileDone,
      detail: profile?.display_name?.trim() || "Not set",
    },
    {
      id: "industries",
      label: "Industries & Markets",
      done: (industryCount ?? 0) > 0,
      detail: countLabel(industryCount, "industry", "industries"),
    },
    {
      id: "capabilities",
      label: "Capabilities",
      done: (capabilityCount ?? 0) > 0,
      detail: countLabel(capabilityCount, "capability", "capabilities"),
    },
    {
      id: "personas",
      label: "Personas",
      done: (personaCount ?? 0) > 0,
      detail: countLabel(personaCount, "persona", "personas"),
    },
    {
      id: "questions",
      label: "Questions & Conversations",
      done: (questionCount ?? 0) > 0,
      detail: countLabel(questionCount, "question", "questions"),
    },
    {
      id: "povs",
      label: "Points of View",
      done: (povCount ?? 0) > 0,
      detail: countLabel(povCount, "POV", "POVs"),
    },
    {
      id: "proof",
      label: "Proof & Evidence",
      done: (proofCount ?? 0) > 0,
      detail: countLabel(proofCount, "proof item", "proof items"),
    },
    {
      id: "terminology",
      label: "Terminology",
      done: (termCount ?? 0) > 0,
      detail: countLabel(termCount, "term", "terms"),
    },
  ];

  const spineDone = spine.filter((s) => s.done).length;
  const spineTotal = spine.length;
  const sourcesTotal = sourceCount ?? 0;
  const sourcesAccepted = acceptedCount ?? 0;
  const evidenceReady = sourcesAccepted > 0;
  const knowledgeReady = spineDone === spineTotal;
  const phase2Ready = knowledgeReady && evidenceReady;
  const phase3Ready = Boolean(approvedBaseline);

  const next = nextAction({
    phase2Ready,
    phase3Ready,
    knowledgeReady,
    evidenceReady,
    firstIncomplete: spine.find((s) => !s.done)?.label ?? null,
    baselineVersion: approvedBaseline?.version ?? null,
  });

  return (
    <WorkspaceShell
      tenantName={ctx.tenantName}
      email={ctx.user.email}
      role={ctx.role}
      avatarUrl={
        typeof ctx.user.user_metadata?.avatar_url === "string"
          ? ctx.user.user_metadata.avatar_url
          : null
      }
    >
      <WorkspacePageWide>
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Delivery sequence
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {ctx.workspaceName ?? "Knowledge Workspace"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Curated knowledge → Authority Baseline → Messaging Plan → content
            ops. Finish this foundation before generating a baseline.
          </p>

          <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <SequencePill label="1. Knowledge" active done={phase2Ready} />
            <span className="text-muted" aria-hidden>
              →
            </span>
            <SequencePill
              label="2. Baseline"
              active={phase2Ready && !phase3Ready}
              done={phase3Ready}
              locked={!phase2Ready}
            />
            <span className="text-muted" aria-hidden>
              →
            </span>
            <SequencePill label="3. Messaging plan" locked={!phase3Ready} />
            <span className="text-muted" aria-hidden>
              →
            </span>
            <SequencePill label="4. Content ops" locked={!phase3Ready} />
          </ol>

          <section className="mt-10 rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Structured knowledge
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {spineDone} of {spineTotal} categories complete
                </p>
              </div>
              <Link
                href="/workspace/knowledge"
                className="text-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                Open Knowledge
              </Link>
            </div>
            <ul className="mt-5 divide-y divide-border border-t border-border">
              {spine.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusDot done={item.done} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.label}
                      </p>
                      <p className="truncate text-xs text-muted">{item.detail}</p>
                    </div>
                  </div>
                  <span
                    className={
                      item.done
                        ? "shrink-0 text-xs font-medium text-foreground"
                        : "shrink-0 text-xs text-muted"
                    }
                  >
                    {item.done ? "Ready" : "Needed"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold tracking-tight">Evidence</h2>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {sourcesAccepted}
                <span className="text-lg font-normal text-muted">
                  {" "}
                  / {sourcesTotal}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">
                Accepted sources available for cited chat
              </p>
              <Link
                href="/workspace/library"
                className="mt-4 inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                Open My Library
              </Link>
            </div>

            <div className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold tracking-tight">
                Next step
              </h2>
              <p className="mt-3 text-sm text-foreground">{next.title}</p>
              <p className="mt-1 text-sm text-muted">{next.body}</p>
              <Link
                href={next.href}
                className="mt-5 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                {next.cta}
              </Link>
            </div>
          </section>
        </div>
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

function countLabel(
  count: number | null | undefined,
  singular: string,
  plural: string,
): string {
  const n = count ?? 0;
  if (n === 0) return `None yet`;
  if (n === 1) return `1 ${singular}`;
  return `${n} ${plural}`;
}

function nextAction(input: {
  phase2Ready: boolean;
  phase3Ready: boolean;
  knowledgeReady: boolean;
  evidenceReady: boolean;
  firstIncomplete: string | null;
  baselineVersion: number | null;
}): { title: string; body: string; href: string; cta: string } {
  if (input.phase3Ready) {
    return {
      title: `Authority Baseline v${input.baselineVersion ?? 1} approved`,
      body: "Messaging Plan is the next phase. Content ops unlock after that.",
      href: "/workspace/knowledge?baseline=1",
      cta: "View baseline",
    };
  }
  if (input.phase2Ready) {
    return {
      title: "Generate your Authority Baseline",
      body: "Knowledge and evidence are ready. Draft a baseline, review it, and approve v1.",
      href: "/workspace/knowledge?baseline=1",
      cta: "Open Baseline",
    };
  }
  if (!input.knowledgeReady) {
    return {
      title: `Complete ${input.firstIncomplete ?? "structured knowledge"}`,
      body: "Fill every Knowledge category so claims stay company-true.",
      href: "/workspace/knowledge",
      cta: "Continue Knowledge",
    };
  }
  return {
    title: "Accept evidence sources",
    body: "Add notes, URLs, or uploads and mark them accepted so chat can cite them.",
    href: "/workspace/library",
    cta: "Review sources",
  };
}

function StatusDot({ done }: { done: boolean }) {
  if (done) {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
        aria-hidden
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 rounded-full border border-border"
      aria-hidden
    />
  );
}

function SequencePill({
  label,
  active,
  done,
  locked,
}: {
  label: string;
  active?: boolean;
  done?: boolean;
  locked?: boolean;
}) {
  return (
    <li
      className={
        done
          ? "rounded-md bg-accent/15 px-2.5 py-1 text-foreground"
          : active
            ? "rounded-md border border-foreground/20 bg-surface px-2.5 py-1 text-foreground"
            : locked
              ? "rounded-md px-2.5 py-1 text-muted"
              : "rounded-md px-2.5 py-1 text-muted"
      }
    >
      {label}
    </li>
  );
}

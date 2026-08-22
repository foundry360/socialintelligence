import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspacePageWide } from "@/components/workspace-page";
import { BaselinePanel } from "@/components/baseline-panel";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import {
  mapBaselineListItem,
  type AuthorityBaselineRow,
} from "@/lib/workspace/baseline";

export default async function AuthorityBaselinePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Authority Baseline</h1>
        <p className="mt-4 text-muted">Configure Supabase env vars first.</p>
      </main>
    );
  }

  const params = await searchParams;
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const canEdit =
    ctx.role === "owner" || ctx.role === "admin" || ctx.role === "editor";

  const [
    { data: baselineRows },
    { data: sources },
    { count: industryCount },
    { count: capabilityCount },
    { count: personaCount },
    { count: questionCount },
    { count: povCount },
    { count: proofCount },
    { count: termCount },
    { data: profile },
    { count: acceptedCount },
  ] = await Promise.all([
    supabase
      .from("authority_baselines")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("version", { ascending: false }),
    supabase
      .from("knowledge_sources")
      .select("id, title")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
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
      .from("company_profiles")
      .select("display_name, legal_name, summary, positioning")
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("knowledge_sources")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("evidence_status", "accepted")
      .is("deleted_at", null),
  ]);

  const profileDone = Boolean(
    profile?.display_name?.trim() &&
      profile?.legal_name?.trim() &&
      (profile?.summary?.trim() || profile?.positioning?.trim()),
  );
  const spineTotal = 8;
  const spineDone = [
    profileDone,
    (industryCount ?? 0) > 0,
    (capabilityCount ?? 0) > 0,
    (personaCount ?? 0) > 0,
    (questionCount ?? 0) > 0,
    (povCount ?? 0) > 0,
    (proofCount ?? 0) > 0,
    (termCount ?? 0) > 0,
  ].filter(Boolean).length;
  const foundationReady =
    spineDone === spineTotal && (acceptedCount ?? 0) > 0;

  const baselines = (baselineRows ?? []).map((row) =>
    mapBaselineListItem(row as AuthorityBaselineRow),
  );

  return (
    <WorkspaceShell
      tenantName={ctx.tenantName}
      email={ctx.user.email}
      avatarUrl={
        typeof ctx.user.user_metadata?.avatar_url === "string"
          ? ctx.user.user_metadata.avatar_url
          : null
      }
    >
      <WorkspacePageWide>
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Phase 3
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Authority Baseline
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Versioned assessment of authority strengths, gaps, and recommended
            actions. Approve a baseline before moving to the messaging plan.
          </p>
          <div className="mt-8">
            <BaselinePanel
              baselines={baselines}
              sources={(sources ?? []).map((s) => ({
                id: s.id,
                title: s.title,
              }))}
              canEdit={canEdit}
              foundationReady={foundationReady}
              selectedId={params.id ?? null}
            />
          </div>
        </div>
      </WorkspacePageWide>
    </WorkspaceShell>
  );
}

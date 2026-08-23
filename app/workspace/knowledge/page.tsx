import { WorkspaceShell } from "@/components/workspace-shell";
import {
  KnowledgeChecklist,
  type KnowledgeCapability,
  type KnowledgeIndustry,
  type KnowledgeMarketQuestion,
  type KnowledgePersona,
  type KnowledgePov,
  type KnowledgeProfile,
  type KnowledgeProofItem,
  type KnowledgeTerm,
} from "@/components/knowledge-checklist";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import {
  mapBaselineListItem,
  type AuthorityBaselineRow,
} from "@/lib/workspace/baseline";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ baseline?: string }>;
}) {
  const params = await searchParams;
  const openBaselineInitially =
    params.baseline === "1" || params.baseline === "open";

  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const canEdit =
    ctx.role === "owner" || ctx.role === "admin" || ctx.role === "editor";

  const [
    { data: profile },
    { data: industries },
    { data: povs },
    { data: capabilities },
    { data: personas },
    { data: marketQuestions },
    { data: proofItems },
    { data: terms },
    { data: baselineRows },
    { data: baselineSources },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select(
        "legal_name, display_name, tagline, summary, positioning, differentiators, website_url, website_urls",
      )
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("industries")
      .select("id, name, description")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("points_of_view")
      .select("id, topic_label, stance, status, principles, disagrees_with")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("capabilities")
      .select("id, name, description")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("personas")
      .select("id, name, title_patterns, goals, pains")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("market_questions")
      .select(
        "id, question, persona_id, topic, buying_stage, priority, notes",
      )
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("proof_items")
      .select("id, proof_type, title, summary")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("terminology_entries")
      .select("id, preferred_term, avoid_terms, definition")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("preferred_term"),
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
  ]);

  const profileDone = Boolean(
    profile?.display_name?.trim() &&
      profile?.legal_name?.trim() &&
      (profile?.summary?.trim() || profile?.positioning?.trim()),
  );
  const spineComplete = [
    profileDone,
    (industries?.length ?? 0) > 0,
    (capabilities?.length ?? 0) > 0,
    (personas?.length ?? 0) > 0,
    (marketQuestions?.length ?? 0) > 0,
    (povs?.length ?? 0) > 0,
    (proofItems?.length ?? 0) > 0,
    (terms?.length ?? 0) > 0,
  ].every(Boolean);

  const baselines = (baselineRows ?? []).map((row) =>
    mapBaselineListItem(row as AuthorityBaselineRow),
  );
  const hasBaseline = baselines.length > 0;

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
      <KnowledgeChecklist
        profile={(profile as KnowledgeProfile | null) ?? null}
        industries={(industries as KnowledgeIndustry[] | null) ?? []}
        povs={(povs as KnowledgePov[] | null) ?? []}
        capabilities={(capabilities as KnowledgeCapability[] | null) ?? []}
        personas={(personas as KnowledgePersona[] | null) ?? []}
        marketQuestions={
          (marketQuestions as KnowledgeMarketQuestion[] | null) ?? []
        }
        proofItems={(proofItems as KnowledgeProofItem[] | null) ?? []}
        terms={(terms as KnowledgeTerm[] | null) ?? []}
        canEdit={canEdit}
        hasBaseline={hasBaseline}
        baselines={baselines}
        baselineSources={(baselineSources ?? []).map((source) => ({
          id: source.id,
          title: source.title,
        }))}
        spineComplete={spineComplete}
        openBaselineInitially={openBaselineInitially}
      />
    </WorkspaceShell>
  );
}

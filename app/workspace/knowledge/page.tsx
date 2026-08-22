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

export default async function KnowledgePage() {
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
    { count: baselineCount },
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
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
  ]);

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
        hasBaseline={(baselineCount ?? 0) > 0}
      />
    </WorkspaceShell>
  );
}

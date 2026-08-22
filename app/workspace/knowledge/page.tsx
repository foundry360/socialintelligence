import { WorkspaceShell } from "@/components/workspace-shell";
import {
  KnowledgeChecklist,
  type KnowledgeCapability,
  type KnowledgePersona,
  type KnowledgePov,
  type KnowledgeProfile,
  type KnowledgeTerm,
} from "@/components/knowledge-checklist";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";

export default async function KnowledgePage() {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const [
    { data: profile },
    { data: povs },
    { data: capabilities },
    { data: personas },
    { data: terms },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select(
        "legal_name, display_name, tagline, summary, positioning, differentiators, website_url, website_urls",
      )
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
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
      .from("terminology_entries")
      .select("id, preferred_term, avoid_terms, definition")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("preferred_term"),
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
        povs={(povs as KnowledgePov[] | null) ?? []}
        capabilities={(capabilities as KnowledgeCapability[] | null) ?? []}
        personas={(personas as KnowledgePersona[] | null) ?? []}
        terms={(terms as KnowledgeTerm[] | null) ?? []}
      />
    </WorkspaceShell>
  );
}

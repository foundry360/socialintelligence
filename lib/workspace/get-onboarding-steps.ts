import "server-only";

import { createClient } from "@/lib/db/server";
import {
  buildOnboardingSteps,
  type OnboardingStep,
} from "@/lib/workspace/onboarding";

export async function getWorkspaceOnboardingSteps(
  tenantId: string,
): Promise<OnboardingStep[]> {
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
    { count: acceptedCount },
    { count: missionCount },
    { count: memberCount },
    { data: approvedBaseline },
  ] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("legal_name, display_name, summary, positioning")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("industries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("capabilities")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("personas")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("market_questions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("points_of_view")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("proof_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("terminology_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("knowledge_sources")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("evidence_status", "accepted")
      .is("deleted_at", null),
    supabase
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabase
      .from("tenant_memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("authority_baselines")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "approved")
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const profileDone = Boolean(
    profile?.display_name?.trim() &&
      profile?.legal_name?.trim() &&
      (profile?.summary?.trim() || profile?.positioning?.trim()),
  );

  const knowledgeReady = [
    profileDone,
    (industryCount ?? 0) > 0,
    (capabilityCount ?? 0) > 0,
    (personaCount ?? 0) > 0,
    (questionCount ?? 0) > 0,
    (povCount ?? 0) > 0,
    (proofCount ?? 0) > 0,
    (termCount ?? 0) > 0,
  ].every(Boolean);

  return buildOnboardingSteps({
    knowledgeReady,
    evidenceReady: (acceptedCount ?? 0) > 0,
    baselineApproved: Boolean(approvedBaseline),
    teamReady: (memberCount ?? 0) > 1,
    hasProject: (missionCount ?? 0) > 0,
  });
}

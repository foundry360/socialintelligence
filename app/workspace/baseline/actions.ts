"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { generateAuthorityBaselineDraft } from "@/lib/knowledge/generate-baseline";
import { createClient } from "@/lib/db/server";

function canEdit(role: string): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export async function generateAuthorityBaseline(): Promise<{ id: string }> {
  const ctx = await requireWorkspaceContext();
  if (!canEdit(ctx.role)) {
    throw new Error("You do not have permission to generate a baseline.");
  }

  const supabase = await createClient();

  const { count: acceptedCount } = await supabase
    .from("knowledge_sources")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("evidence_status", "accepted")
    .is("deleted_at", null);

  if ((acceptedCount ?? 0) === 0) {
    throw new Error(
      "Accept at least one evidence source in My Library before generating a baseline.",
    );
  }

  const draft = await generateAuthorityBaselineDraft(ctx.tenantId);

  const { data: latest } = await supabase
    .from("authority_baselines")
    .select("version")
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("authority_baselines")
    .insert({
      tenant_id: ctx.tenantId,
      workspace_id: ctx.workspaceId,
      version,
      status: "awaiting_approval",
      summary: draft.summary,
      strengths: draft.strengths,
      weaknesses: draft.weaknesses,
      gaps: draft.gaps,
      pov_coverage_notes: draft.povCoverageNotes,
      trust_mix_notes: draft.trustMixNotes,
      recommended_actions: draft.recommendedActions,
      citation_source_ids: draft.citationSourceIds,
      generated_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save baseline draft.");
  }

  revalidatePath("/workspace/baseline");
  revalidatePath("/workspace/overview");
  return { id: data.id };
}

export async function approveAuthorityBaseline(baselineId: string): Promise<void> {
  const ctx = await requireWorkspaceContext();
  if (!canEdit(ctx.role)) {
    throw new Error("You do not have permission to approve a baseline.");
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: target, error: loadError } = await supabase
    .from("authority_baselines")
    .select("id, status")
    .eq("id", baselineId)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!target) throw new Error("Baseline not found.");
  if (target.status !== "awaiting_approval" && target.status !== "draft") {
    throw new Error("Only draft baselines can be approved.");
  }

  const { error: supersedeError } = await supabase
    .from("authority_baselines")
    .update({ status: "superseded" })
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "approved")
    .is("deleted_at", null);

  if (supersedeError) throw new Error(supersedeError.message);

  const { error: approveError } = await supabase
    .from("authority_baselines")
    .update({
      status: "approved",
      approved_by: ctx.user.id,
      approved_at: now,
    })
    .eq("id", baselineId)
    .eq("tenant_id", ctx.tenantId);

  if (approveError) throw new Error(approveError.message);

  revalidatePath("/workspace/baseline");
  revalidatePath("/workspace/overview");
}

export async function rejectAuthorityBaseline(baselineId: string): Promise<void> {
  const ctx = await requireWorkspaceContext();
  if (!canEdit(ctx.role)) {
    throw new Error("You do not have permission to reject a baseline.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("authority_baselines")
    .update({ status: "rejected" })
    .eq("id", baselineId)
    .eq("tenant_id", ctx.tenantId)
    .in("status", ["awaiting_approval", "draft"]);

  if (error) throw new Error(error.message);

  revalidatePath("/workspace/baseline");
  revalidatePath("/workspace/overview");
}

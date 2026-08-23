"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import { MISSION_DESCRIPTION_MAX_LENGTH } from "@/lib/workspace/missions";
import {
  mergeLibraryCatalogs,
  type LibraryCatalog,
} from "@/lib/workspace/library";

export async function createMission(formData: FormData) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, MISSION_DESCRIPTION_MAX_LENGTH);
  const projectLeadId = String(formData.get("project_lead_id") ?? "").trim();
  if (title.length < 2) throw new Error("Project title is required.");
  if (!projectLeadId) throw new Error("Project lead is required.");

  const { data: leadMembership } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("user_id", projectLeadId)
    .maybeSingle();

  if (!leadMembership) {
    throw new Error("Project lead must be a member of this workspace.");
  }

  const { data: lastMission } = await supabase
    .from("missions")
    .select("sort_order")
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (lastMission?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("missions")
    .insert({
      tenant_id: ctx.tenantId,
      title,
      description,
      created_by: ctx.user.id,
      project_lead_id: projectLeadId,
      sort_order,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create project.");
  }

  revalidatePath("/workspace");
  redirect(`/workspace/missions/${data.id}`);
}

export async function removeMission(missionId: string) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("missions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", missionId)
    .eq("tenant_id", ctx.tenantId);

  if (error) throw new Error(error.message);

  revalidatePath("/workspace");
}

export async function updateMission(formData: FormData) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const missionId = String(formData.get("missionId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, MISSION_DESCRIPTION_MAX_LENGTH);

  if (!missionId) throw new Error("Project id is required.");
  if (title.length < 2) throw new Error("Project title is required.");

  const { error } = await supabase
    .from("missions")
    .update({ title, description })
    .eq("id", missionId)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/workspace");
  revalidatePath(`/workspace/missions/${missionId}`);
}

export async function attachSourceToMission(missionId: string, sourceId: string) {
  await attachSourcesToMission(missionId, [sourceId]);
}

export type MissionLibrarySourceOption = {
  id: string;
  title: string;
  source_type: string;
  url: string | null;
  catalogs: string[];
  attached: boolean;
};

export type MissionLibraryPickerData = {
  sources: MissionLibrarySourceOption[];
  catalogs: LibraryCatalog[];
};

export async function listLibrarySourcesForMissionAttach(
  missionId: string,
): Promise<MissionLibraryPickerData> {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const [
    { data: sources },
    { data: links },
    { data: catalogLinks },
    { data: customCatalogRows },
  ] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select("id, title, source_type, url")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .order("title", { ascending: true }),
    supabase
      .from("mission_sources")
      .select("source_id")
      .eq("mission_id", missionId)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("knowledge_source_catalogs")
      .select("source_id, catalog_slug")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("library_catalogs")
      .select("id, name, slug, sort_order")
      .eq("tenant_id", ctx.tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const attached = new Set((links ?? []).map((row) => row.source_id));
  const catalogsBySource = new Map<string, string[]>();
  for (const row of catalogLinks ?? []) {
    const current = catalogsBySource.get(row.source_id) ?? [];
    current.push(row.catalog_slug);
    catalogsBySource.set(row.source_id, current);
  }

  const catalogs = mergeLibraryCatalogs(
    (customCatalogRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sort_order: row.sort_order,
    })),
  );

  return {
    catalogs,
    sources: (sources ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      source_type: row.source_type,
      url: row.url,
      catalogs: catalogsBySource.get(row.id) ?? [],
      attached: attached.has(row.id),
    })),
  };
}

export async function attachSourcesToMission(
  missionId: string,
  sourceIds: string[],
) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const uniqueIds = [...new Set(sourceIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const { data: mission } = await supabase
    .from("missions")
    .select("id")
    .eq("id", missionId)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!mission) throw new Error("Project not found.");

  const [{ data: sourceRows, error: sourceError }, { data: existingLinks }] =
    await Promise.all([
      supabase
        .from("knowledge_sources")
        .select("id")
        .eq("tenant_id", ctx.tenantId)
        .is("deleted_at", null)
        .in("id", uniqueIds),
      supabase
        .from("mission_sources")
        .select("source_id")
        .eq("mission_id", missionId)
        .eq("tenant_id", ctx.tenantId)
        .in("source_id", uniqueIds),
    ]);

  if (sourceError) throw new Error(sourceError.message);
  if ((sourceRows ?? []).length !== uniqueIds.length) {
    throw new Error("One or more sources could not be found.");
  }

  const alreadyAttached = new Set(
    (existingLinks ?? []).map((row) => row.source_id),
  );
  const toAttach = uniqueIds.filter((sourceId) => !alreadyAttached.has(sourceId));
  if (toAttach.length === 0) return;

  const { error } = await supabase.from("mission_sources").insert(
    toAttach.map((sourceId) => ({
      mission_id: missionId,
      source_id: sourceId,
      tenant_id: ctx.tenantId,
    })),
  );
  if (error) throw new Error(error.message);

  revalidatePath("/workspace");
  revalidatePath(`/workspace/missions/${missionId}`);
}

export async function detachSourceFromMission(
  missionId: string,
  sourceId: string,
) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("mission_sources")
    .delete()
    .eq("mission_id", missionId)
    .eq("source_id", sourceId)
    .eq("tenant_id", ctx.tenantId);

  if (error) throw new Error(error.message);

  revalidatePath("/workspace");
  revalidatePath(`/workspace/missions/${missionId}`);
}

export async function reorderMissions(orderedIds: string[]) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const uniqueIds = [...new Set(orderedIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const { data: rows, error: loadError } = await supabase
    .from("missions")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .in("id", uniqueIds);

  if (loadError) throw new Error(loadError.message);
  if ((rows ?? []).length !== uniqueIds.length) {
    throw new Error("One or more projects could not be reordered.");
  }

  const updates = uniqueIds.map((id, index) =>
    supabase
      .from("missions")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null),
  );

  const results = await Promise.all(updates);
  for (const result of results) {
    if (result.error) throw new Error(result.error.message);
  }

  revalidatePath("/workspace");
}

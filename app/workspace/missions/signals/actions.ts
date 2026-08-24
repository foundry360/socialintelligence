"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/db/server";
import {
  mapWatchCriterionRow,
  mapWatchFeedRow,
  mapWatchProfileRow,
  normalizeCriterionValue,
  parseCriteriaJson,
  parseFeedsJson,
  type WatchProfileDetail,
  type WatchProfileListItem,
} from "@/lib/workspace/watch-profiles";

async function assertMissionOwned(tenantId: string, missionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("missions")
    .select("id")
    .eq("id", missionId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new Error("Project not found.");
}

async function assertWatchProfileOwned(
  tenantId: string,
  profileId: string,
): Promise<{ mission_id: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("watch_profiles")
    .select("id, mission_id")
    .eq("id", profileId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new Error("Watch profile not found.");
  return data;
}

function revalidateMission(missionId: string) {
  revalidatePath(`/workspace/missions/${missionId}`);
  revalidatePath(`/workspace/missions/${missionId}/watch`);
}

export async function listWatchProfiles(
  missionId: string,
): Promise<WatchProfileListItem[]> {
  const ctx = await requireWorkspaceContext();
  await assertMissionOwned(ctx.tenantId, missionId);
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("watch_profiles")
    .select(
      "id, tenant_id, mission_id, name, description, enabled, config, created_by, created_at, updated_at, deleted_at",
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("mission_id", missionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const ids = (profiles ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const [{ data: criteriaRows }, { data: feedRows }] = await Promise.all([
    supabase
      .from("watch_criteria")
      .select("watch_profile_id")
      .eq("tenant_id", ctx.tenantId)
      .in("watch_profile_id", ids),
    supabase
      .from("watch_feeds")
      .select("watch_profile_id")
      .eq("tenant_id", ctx.tenantId)
      .is("deleted_at", null)
      .in("watch_profile_id", ids),
  ]);

  const criteriaCount = new Map<string, number>();
  for (const row of criteriaRows ?? []) {
    criteriaCount.set(
      row.watch_profile_id,
      (criteriaCount.get(row.watch_profile_id) ?? 0) + 1,
    );
  }

  const feedsCount = new Map<string, number>();
  for (const row of feedRows ?? []) {
    feedsCount.set(
      row.watch_profile_id,
      (feedsCount.get(row.watch_profile_id) ?? 0) + 1,
    );
  }

  return (profiles ?? []).map((row) => ({
    ...mapWatchProfileRow(row),
    criteriaCount: criteriaCount.get(row.id) ?? 0,
    feedsCount: feedsCount.get(row.id) ?? 0,
  }));
}

export async function getWatchProfile(
  profileId: string,
): Promise<WatchProfileDetail> {
  const ctx = await requireWorkspaceContext();
  await assertWatchProfileOwned(ctx.tenantId, profileId);
  const supabase = await createClient();

  const [{ data: profile, error }, { data: criteria }, { data: feeds }] =
    await Promise.all([
      supabase
        .from("watch_profiles")
        .select(
          "id, tenant_id, mission_id, name, description, enabled, config, created_by, created_at, updated_at, deleted_at",
        )
        .eq("id", profileId)
        .eq("tenant_id", ctx.tenantId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("watch_criteria")
        .select(
          "id, tenant_id, watch_profile_id, criterion_type, value, value_normalized, metadata, created_at, updated_at",
        )
        .eq("watch_profile_id", profileId)
        .eq("tenant_id", ctx.tenantId)
        .order("criterion_type")
        .order("value"),
      supabase
        .from("watch_feeds")
        .select(
          "id, tenant_id, watch_profile_id, feed_type, feed_url, label, enabled, last_fetched_at, created_at, updated_at, deleted_at",
        )
        .eq("watch_profile_id", profileId)
        .eq("tenant_id", ctx.tenantId)
        .is("deleted_at", null)
        .order("created_at"),
    ]);

  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Watch profile not found.");

  return {
    ...mapWatchProfileRow(profile),
    criteria: (criteria ?? []).map(mapWatchCriterionRow),
    feeds: (feeds ?? []).map(mapWatchFeedRow),
  };
}

async function replaceCriteriaAndFeeds(
  tenantId: string,
  profileId: string,
  criteriaJson: string,
  feedsJson: string,
) {
  const supabase = await createClient();
  const criteria = parseCriteriaJson(criteriaJson);
  const feeds = parseFeedsJson(feedsJson);

  const { error: deleteCriteriaError } = await supabase
    .from("watch_criteria")
    .delete()
    .eq("watch_profile_id", profileId)
    .eq("tenant_id", tenantId);
  if (deleteCriteriaError) throw new Error(deleteCriteriaError.message);

  const { error: deleteFeedsError } = await supabase
    .from("watch_feeds")
    .update({ deleted_at: new Date().toISOString() })
    .eq("watch_profile_id", profileId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  if (deleteFeedsError) throw new Error(deleteFeedsError.message);

  if (criteria.length > 0) {
    const { error } = await supabase.from("watch_criteria").insert(
      criteria.map((c) => ({
        tenant_id: tenantId,
        watch_profile_id: profileId,
        criterion_type: c.criterionType,
        value: c.value,
        value_normalized: normalizeCriterionValue(c.value),
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (feeds.length > 0) {
    const { error } = await supabase.from("watch_feeds").insert(
      feeds.map((f) => ({
        tenant_id: tenantId,
        watch_profile_id: profileId,
        feed_type: "rss",
        feed_url: f.feedUrl,
        label: f.label ?? null,
        enabled: true,
      })),
    );
    if (error) throw new Error(error.message);
  }
}

export async function createWatchProfile(formData: FormData) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const missionId = String(formData.get("missionId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const enabled = formData.get("enabled") !== "false";
  const criteriaJson = String(formData.get("criteriaJson") ?? "[]");
  const feedsJson = String(formData.get("feedsJson") ?? "[]");

  if (!missionId) throw new Error("Project id is required.");
  if (name.length < 2) throw new Error("Watch profile name is required.");

  await assertMissionOwned(ctx.tenantId, missionId);
  parseCriteriaJson(criteriaJson);
  parseFeedsJson(feedsJson);

  const { data, error } = await supabase
    .from("watch_profiles")
    .insert({
      tenant_id: ctx.tenantId,
      mission_id: missionId,
      name,
      description,
      enabled,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create watch profile.");

  await replaceCriteriaAndFeeds(ctx.tenantId, data.id, criteriaJson, feedsJson);
  revalidateMission(missionId);
  return data.id;
}

export async function updateWatchProfile(formData: FormData) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();

  const profileId = String(formData.get("profileId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const enabled = formData.get("enabled") !== "false";
  const criteriaJson = String(formData.get("criteriaJson") ?? "[]");
  const feedsJson = String(formData.get("feedsJson") ?? "[]");

  if (!profileId) throw new Error("Watch profile id is required.");
  if (name.length < 2) throw new Error("Watch profile name is required.");

  const profile = await assertWatchProfileOwned(ctx.tenantId, profileId);
  parseCriteriaJson(criteriaJson);
  parseFeedsJson(feedsJson);

  const { error } = await supabase
    .from("watch_profiles")
    .update({ name, description, enabled })
    .eq("id", profileId)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  await replaceCriteriaAndFeeds(ctx.tenantId, profileId, criteriaJson, feedsJson);
  revalidateMission(profile.mission_id);
}

export async function deleteWatchProfile(profileId: string) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const profile = await assertWatchProfileOwned(ctx.tenantId, profileId);

  const { error } = await supabase
    .from("watch_profiles")
    .update({ deleted_at: new Date().toISOString(), enabled: false })
    .eq("id", profileId)
    .eq("tenant_id", ctx.tenantId);

  if (error) throw new Error(error.message);
  revalidateMission(profile.mission_id);
}

export async function setWatchProfileEnabled(profileId: string, enabled: boolean) {
  const ctx = await requireWorkspaceContext();
  const supabase = await createClient();
  const profile = await assertWatchProfileOwned(ctx.tenantId, profileId);

  const { error } = await supabase
    .from("watch_profiles")
    .update({ enabled })
    .eq("id", profileId)
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  revalidateMission(profile.mission_id);
}

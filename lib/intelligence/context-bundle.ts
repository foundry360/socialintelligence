import "server-only";

import { buildStructuredKnowledgeText } from "@/lib/knowledge/context";
import { createClient } from "@/lib/db/server";
import {
  formatApprovedBaselineSummary,
  formatProjectContextBlock,
  formatProjectMissionFocus,
  formatWatchProfilesSummary,
  mergeTenantKnowledgeForLlm,
} from "@/lib/intelligence/context-bundle-format";
import { mapBaselineRow, type AuthorityBaselineRow } from "@/lib/workspace/baseline";

export type TenantContextBundle = {
  cacheKey: string;
  tenantKnowledge: string;
  structuredKnowledge: string;
  baselineSummary: string;
};

export type ProjectContextBundle = {
  cacheKey: string;
  missionFocus: string;
  missionTitle: string;
};

const tenantBundleCache = new Map<string, TenantContextBundle>();
const projectBundleCache = new Map<string, ProjectContextBundle>();

export function clearContextBundleCache(): void {
  tenantBundleCache.clear();
  projectBundleCache.clear();
}

export function invalidateTenantContextBundle(tenantId: string): void {
  for (const key of tenantBundleCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      tenantBundleCache.delete(key);
    }
  }
}

export function invalidateProjectContextBundle(missionId: string): void {
  for (const key of projectBundleCache.keys()) {
    if (key.startsWith(`${missionId}:`)) {
      projectBundleCache.delete(key);
    }
  }
}

async function latestTableUpdatedAt(
  table:
    | "company_profiles"
    | "industries"
    | "capabilities"
    | "personas"
    | "market_questions"
    | "points_of_view"
    | "proof_items"
    | "terminology_entries",
  tenantId: string,
): Promise<string> {
  const supabase = await createClient();
  let query = supabase
    .from(table)
    .select("updated_at")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (table !== "company_profiles") {
    query = query.is("deleted_at", null);
  }

  const { data } = await query.maybeSingle();
  return data?.updated_at ?? "";
}

async function fetchTenantContextStamp(tenantId: string): Promise<string> {
  const supabase = await createClient();

  const [
    profileUpdatedAt,
    industriesUpdatedAt,
    capabilitiesUpdatedAt,
    personasUpdatedAt,
    questionsUpdatedAt,
    povsUpdatedAt,
    proofUpdatedAt,
    termsUpdatedAt,
    baselineResult,
  ] = await Promise.all([
    latestTableUpdatedAt("company_profiles", tenantId),
    latestTableUpdatedAt("industries", tenantId),
    latestTableUpdatedAt("capabilities", tenantId),
    latestTableUpdatedAt("personas", tenantId),
    latestTableUpdatedAt("market_questions", tenantId),
    latestTableUpdatedAt("points_of_view", tenantId),
    latestTableUpdatedAt("proof_items", tenantId),
    latestTableUpdatedAt("terminology_entries", tenantId),
    supabase
      .from("authority_baselines")
      .select(
        "id, version, updated_at, summary, strengths, weaknesses, gaps, pov_coverage_notes, trust_mix_notes, recommended_actions",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "approved")
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const baseline = baselineResult.data as AuthorityBaselineRow | null;
  const baselineStamp = baseline
    ? `${baseline.id}:${baseline.version}:${baseline.updated_at}`
    : "none";

  return [
    profileUpdatedAt,
    industriesUpdatedAt,
    capabilitiesUpdatedAt,
    personasUpdatedAt,
    questionsUpdatedAt,
    povsUpdatedAt,
    proofUpdatedAt,
    termsUpdatedAt,
    baselineStamp,
  ].join("|");
}

async function fetchApprovedBaselineSummary(
  tenantId: string,
): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("authority_baselines")
    .select(
      "id, tenant_id, workspace_id, version, status, summary, strengths, weaknesses, gaps, pov_coverage_notes, trust_mix_notes, recommended_actions, citation_source_ids, generated_by, approved_by, approved_at, created_at, updated_at, deleted_at",
    )
    .eq("tenant_id", tenantId)
    .eq("status", "approved")
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return "";

  const mapped = mapBaselineRow(data as AuthorityBaselineRow);
  return formatApprovedBaselineSummary(mapped);
}

export async function buildTenantContextBundle(
  tenantId: string,
): Promise<TenantContextBundle> {
  const stamp = await fetchTenantContextStamp(tenantId);
  const cacheKey = `${tenantId}:${stamp}`;
  const cached = tenantBundleCache.get(cacheKey);
  if (cached) return cached;

  const [structuredKnowledge, baselineSummary] = await Promise.all([
    buildStructuredKnowledgeText(tenantId),
    fetchApprovedBaselineSummary(tenantId),
  ]);

  const bundle: TenantContextBundle = {
    cacheKey,
    structuredKnowledge,
    baselineSummary,
    tenantKnowledge: mergeTenantKnowledgeForLlm(
      structuredKnowledge,
      baselineSummary,
    ),
  };

  tenantBundleCache.set(cacheKey, bundle);
  return bundle;
}

async function fetchProjectContextStamp(
  missionId: string,
  tenantId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("updated_at")
    .eq("id", missionId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!mission) return null;

  const { data: profiles } = await supabase
    .from("watch_profiles")
    .select("id, updated_at")
    .eq("mission_id", missionId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const profileStamp = (profiles ?? [])
    .map((profile) => `${profile.id}:${profile.updated_at}`)
    .join(",");

  return `${mission.updated_at}|${profileStamp}`;
}

export async function buildProjectContextBundle(
  missionId: string,
  tenantId: string,
): Promise<ProjectContextBundle | null> {
  const stamp = await fetchProjectContextStamp(missionId, tenantId);
  if (!stamp) return null;

  const cacheKey = `${missionId}:${stamp}`;
  const cached = projectBundleCache.get(cacheKey);
  if (cached) return cached;

  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("title, description")
    .eq("id", missionId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!mission) return null;

  const { data: profiles } = await supabase
    .from("watch_profiles")
    .select("id, name, enabled")
    .eq("mission_id", missionId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const profileIds = (profiles ?? []).map((profile) => profile.id);
  const criteriaCountByProfile = new Map<string, number>();
  const feedsCountByProfile = new Map<string, number>();

  if (profileIds.length > 0) {
    const [{ data: criteriaRows }, { data: feedRows }] = await Promise.all([
      supabase
        .from("watch_criteria")
        .select("watch_profile_id")
        .eq("tenant_id", tenantId)
        .in("watch_profile_id", profileIds),
      supabase
        .from("watch_feeds")
        .select("watch_profile_id")
        .eq("tenant_id", tenantId)
        .in("watch_profile_id", profileIds)
        .is("deleted_at", null),
    ]);

    for (const row of criteriaRows ?? []) {
      criteriaCountByProfile.set(
        row.watch_profile_id,
        (criteriaCountByProfile.get(row.watch_profile_id) ?? 0) + 1,
      );
    }
    for (const row of feedRows ?? []) {
      feedsCountByProfile.set(
        row.watch_profile_id,
        (feedsCountByProfile.get(row.watch_profile_id) ?? 0) + 1,
      );
    }
  }

  const missionFocus = formatProjectMissionFocus({
    title: mission.title,
    description: mission.description ?? "",
  });

  const watchProfilesSummary = formatWatchProfilesSummary(
    (profiles ?? []).map((profile) => ({
      name: profile.name,
      enabled: profile.enabled,
      criteriaCount: criteriaCountByProfile.get(profile.id) ?? 0,
      feedsCount: feedsCountByProfile.get(profile.id) ?? 0,
    })),
  );

  const bundle: ProjectContextBundle = {
    cacheKey,
    missionTitle: mission.title,
    missionFocus: formatProjectContextBlock(missionFocus, watchProfilesSummary),
  };

  projectBundleCache.set(cacheKey, bundle);
  return bundle;
}

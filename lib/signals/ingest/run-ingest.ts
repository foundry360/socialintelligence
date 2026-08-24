import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/db/supabase";
import { fetchRssFeed } from "@/lib/signals/ingest/rss-collector";
import {
  canonicalizeUrl,
  contentHash,
  eventFingerprint,
  extractDomain,
  urlFingerprint,
} from "@/lib/signals/ingest/normalize";

export type IngestRunStats = {
  feedsPolled: number;
  feedsSkipped: number;
  feedsNotModified: number;
  sourcesFetched: number;
  sourcesNew: number;
  sourcesDuplicate: number;
  candidatesCreated: number;
  candidatesMerged: number;
  errors: string[];
};

type WatchFeedRow = {
  id: string;
  tenant_id: string;
  watch_profile_id: string;
  feed_type: string;
  feed_url: string;
  label: string | null;
  last_etag: string | null;
  last_modified: string | null;
  watch_profiles: {
    mission_id: string;
    enabled: boolean;
    deleted_at: string | null;
    missions: {
      deleted_at: string | null;
    } | null;
  } | null;
};

type NormalizedSourceItem = {
  title: string;
  link: string;
  description: string;
  author: string | null;
  publishedAt: string | null;
  publisher: string;
};

function emptyStats(): IngestRunStats {
  return {
    feedsPolled: 0,
    feedsSkipped: 0,
    feedsNotModified: 0,
    sourcesFetched: 0,
    sourcesNew: 0,
    sourcesDuplicate: 0,
    candidatesCreated: 0,
    candidatesMerged: 0,
    errors: [],
  };
}

function mergeStats(target: IngestRunStats, delta: IngestRunStats): void {
  target.feedsPolled += delta.feedsPolled;
  target.feedsSkipped += delta.feedsSkipped;
  target.feedsNotModified += delta.feedsNotModified;
  target.sourcesFetched += delta.sourcesFetched;
  target.sourcesNew += delta.sourcesNew;
  target.sourcesDuplicate += delta.sourcesDuplicate;
  target.candidatesCreated += delta.candidatesCreated;
  target.candidatesMerged += delta.candidatesMerged;
  target.errors.push(...delta.errors);
}

function mapWatchFeedRow(row: Record<string, unknown>): WatchFeedRow | null {
  const profileRaw = row.watch_profiles;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
  if (!profile || typeof profile !== "object") return null;

  const profileRecord = profile as Record<string, unknown>;
  const missionRaw = profileRecord.missions;
  const mission = Array.isArray(missionRaw) ? missionRaw[0] : missionRaw;

  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    watch_profile_id: String(row.watch_profile_id),
    feed_type: String(row.feed_type),
    feed_url: String(row.feed_url),
    label: row.label == null ? null : String(row.label),
    last_etag: row.last_etag == null ? null : String(row.last_etag),
    last_modified: row.last_modified == null ? null : String(row.last_modified),
    watch_profiles: {
      mission_id: String(profileRecord.mission_id),
      enabled: Boolean(profileRecord.enabled),
      deleted_at:
        profileRecord.deleted_at == null ? null : String(profileRecord.deleted_at),
      missions:
        mission && typeof mission === "object"
          ? {
              deleted_at:
                (mission as { deleted_at?: unknown }).deleted_at == null
                  ? null
                  : String((mission as { deleted_at?: unknown }).deleted_at),
            }
          : null,
    },
  };
}

async function loadEnabledFeeds(
  supabase: SupabaseClient,
): Promise<WatchFeedRow[]> {
  const { data, error } = await supabase
    .from("watch_feeds")
    .select(
      `
      id,
      tenant_id,
      watch_profile_id,
      feed_type,
      feed_url,
      label,
      last_etag,
      last_modified,
      watch_profiles!inner (
        mission_id,
        enabled,
        deleted_at,
        missions (
          deleted_at
        )
      )
    `,
    )
    .eq("enabled", true)
    .is("deleted_at", null)
    .is("watch_profiles.deleted_at", null)
    .eq("watch_profiles.enabled", true);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => mapWatchFeedRow(row as Record<string, unknown>))
    .filter((row): row is WatchFeedRow => row !== null);
}

async function startIngestionRun(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("ingestion_runs")
    .insert({
      tenant_id: tenantId,
      status: "running",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to start ingestion run.");
  }
  return data.id;
}

async function finishIngestionRun(
  supabase: SupabaseClient,
  runId: string,
  stats: IngestRunStats,
  status: "completed" | "failed",
  errorMessage?: string,
): Promise<void> {
  const { error } = await supabase
    .from("ingestion_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      stats,
      error_message: errorMessage ?? null,
    })
    .eq("id", runId);

  if (error) throw new Error(error.message);
}

async function clusterSource(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    missionId: string;
    watchProfileId: string;
    signalSourceId: string;
    title: string;
    description: string;
    publishedAt: string | null;
    domain: string;
    contentHashValue: string;
    eventFingerprintValue: string;
  },
  stats: IngestRunStats,
): Promise<void> {
  const { data: existingByEvent } = await supabase
    .from("candidate_signals")
    .select("id, title, source_count")
    .eq("tenant_id", input.tenantId)
    .eq("mission_id", input.missionId)
    .eq("event_fingerprint", input.eventFingerprintValue)
    .in("status", ["pending", "qualifying"])
    .maybeSingle();

  let candidateId = existingByEvent?.id ?? null;
  let candidateTitle = existingByEvent?.title ?? input.title;
  let linkReason: "initial" | "same_event" | "near_duplicate" = "initial";

  if (!candidateId) {
    const { data: sameHashSources } = await supabase
      .from("signal_sources")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("mission_id", input.missionId)
      .eq("content_hash", input.contentHashValue)
      .neq("id", input.signalSourceId)
      .limit(10);

    const sourceIds = (sameHashSources ?? []).map((row) => row.id);
    if (sourceIds.length > 0) {
      const { data: links } = await supabase
        .from("candidate_signal_sources")
        .select("candidate_signal_id")
        .in("signal_source_id", sourceIds)
        .limit(1);

      candidateId = links?.[0]?.candidate_signal_id ?? null;
      if (candidateId) linkReason = "near_duplicate";
    }
  } else {
    linkReason = "same_event";
  }

  const now = new Date().toISOString();

  if (candidateId) {
    if (!existingByEvent) {
      const { data: candidateRow } = await supabase
        .from("candidate_signals")
        .select("id, title")
        .eq("id", candidateId)
        .eq("tenant_id", input.tenantId)
        .maybeSingle();
      candidateTitle = candidateRow?.title ?? input.title;
    }

    const { error: linkError } = await supabase
      .from("candidate_signal_sources")
      .upsert(
        {
          tenant_id: input.tenantId,
          candidate_signal_id: candidateId,
          signal_source_id: input.signalSourceId,
          link_reason: linkReason,
        },
        { onConflict: "candidate_signal_id,signal_source_id", ignoreDuplicates: true },
      );

    if (linkError) throw new Error(linkError.message);

    const { count } = await supabase
      .from("candidate_signal_sources")
      .select("id", { count: "exact", head: true })
      .eq("candidate_signal_id", candidateId)
      .eq("tenant_id", input.tenantId);

    const { error: updateCandidateError } = await supabase
      .from("candidate_signals")
      .update({
        last_seen_at: now,
        source_count: count ?? 1,
        title: candidateTitle.trim() ? candidateTitle : input.title,
      })
      .eq("id", candidateId)
      .eq("tenant_id", input.tenantId);

    if (updateCandidateError) throw new Error(updateCandidateError.message);
    stats.candidatesMerged += 1;
  } else {
    const { data: created, error: createError } = await supabase
      .from("candidate_signals")
      .insert({
        tenant_id: input.tenantId,
        mission_id: input.missionId,
        watch_profile_id: input.watchProfileId,
        title: input.title,
        event_fingerprint: input.eventFingerprintValue,
        canonical_event_key: input.eventFingerprintValue,
        status: "pending",
        source_count: 1,
        first_seen_at: now,
        last_seen_at: now,
      })
      .select("id")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message ?? "Failed to create candidate signal.");
    }

    candidateId = created.id;
    stats.candidatesCreated += 1;

    const { error: linkError } = await supabase.from("candidate_signal_sources").insert({
      tenant_id: input.tenantId,
      candidate_signal_id: candidateId,
      signal_source_id: input.signalSourceId,
      link_reason: "initial",
    });

    if (linkError) throw new Error(linkError.message);
  }

  const { error: sourceUpdateError } = await supabase
    .from("signal_sources")
    .update({ processing_status: "clustered" })
    .eq("id", input.signalSourceId)
    .eq("tenant_id", input.tenantId);

  if (sourceUpdateError) throw new Error(sourceUpdateError.message);
}

async function persistSourceItem(
  supabase: SupabaseClient,
  feed: WatchFeedRow,
  item: NormalizedSourceItem,
  stats: IngestRunStats,
): Promise<void> {
  const profile = feed.watch_profiles;
  if (!profile?.mission_id) return;

  const canonicalUrl = canonicalizeUrl(item.link);
  const fingerprint = urlFingerprint(canonicalUrl);
  const domain = extractDomain(canonicalUrl);
  const hash = contentHash(item.title, item.description);
  const eventKey = eventFingerprint(item.title, item.publishedAt, domain);

  const { data: inserted, error: insertError } = await supabase
    .from("signal_sources")
    .insert({
      tenant_id: feed.tenant_id,
      mission_id: profile.mission_id,
      watch_profile_id: feed.watch_profile_id,
      watch_feed_id: feed.id,
      title: item.title,
      description: item.description,
      url: item.link,
      canonical_url: canonicalUrl,
      publisher: item.publisher,
      author: item.author,
      published_at: item.publishedAt,
      source_type: "rss",
      domain,
      authority_level: "unknown",
      content_hash: hash,
      url_fingerprint: fingerprint,
      raw_payload: {
        guid: item.link,
        fetchedAt: new Date().toISOString(),
      },
      processing_status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      stats.sourcesDuplicate += 1;
      return;
    }
    throw new Error(insertError.message);
  }

  if (!inserted) return;

  stats.sourcesNew += 1;
  await clusterSource(
    supabase,
    {
      tenantId: feed.tenant_id,
      missionId: profile.mission_id,
      watchProfileId: feed.watch_profile_id,
      signalSourceId: inserted.id,
      title: item.title,
      description: item.description,
      publishedAt: item.publishedAt,
      domain,
      contentHashValue: hash,
      eventFingerprintValue: eventKey,
    },
    stats,
  );
}

async function pollFeed(
  supabase: SupabaseClient,
  feed: WatchFeedRow,
  stats: IngestRunStats,
): Promise<void> {
  const profile = feed.watch_profiles;
  if (
    !profile ||
    profile.deleted_at ||
    !profile.enabled ||
    profile.missions?.deleted_at
  ) {
    stats.feedsSkipped += 1;
    return;
  }

  if (feed.feed_type !== "rss" && feed.feed_type !== "atom") {
    stats.feedsSkipped += 1;
    stats.errors.push(`Feed ${feed.id}: unsupported feed type ${feed.feed_type}.`);
    return;
  }

  stats.feedsPolled += 1;

  try {
    const result = await fetchRssFeed(feed.feed_url, {
      etag: feed.last_etag,
      lastModified: feed.last_modified,
    });

    await supabase
      .from("watch_feeds")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_etag: result.etag,
        last_modified: result.lastModified,
      })
      .eq("id", feed.id)
      .eq("tenant_id", feed.tenant_id);

    if (result.notModified) {
      stats.feedsNotModified += 1;
      return;
    }

    stats.sourcesFetched += result.items.length;
    const publisher = result.feedTitle || feed.label || extractDomain(feed.feed_url);

    for (const item of result.items) {
      await persistSourceItem(
        supabase,
        feed,
        {
          title: item.title,
          link: item.link,
          description: item.description,
          author: item.author,
          publishedAt: item.publishedAt,
          publisher,
        },
        stats,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown feed polling error.";
    stats.errors.push(`Feed ${feed.id} (${feed.feed_url}): ${message}`);

    await supabase
      .from("watch_feeds")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("id", feed.id)
      .eq("tenant_id", feed.tenant_id);
  }
}

export type SignalIngestSummary = {
  tenantsProcessed: number;
  runs: Array<{ tenantId: string; runId: string; stats: IngestRunStats }>;
};

export async function runSignalIngest(): Promise<SignalIngestSummary> {
  const supabase = createServiceClient();
  const feeds = await loadEnabledFeeds(supabase);

  const feedsByTenant = new Map<string, WatchFeedRow[]>();
  for (const feed of feeds) {
    const bucket = feedsByTenant.get(feed.tenant_id) ?? [];
    bucket.push(feed);
    feedsByTenant.set(feed.tenant_id, bucket);
  }

  const summary: SignalIngestSummary = {
    tenantsProcessed: 0,
    runs: [],
  };

  for (const [tenantId, tenantFeeds] of feedsByTenant) {
    summary.tenantsProcessed += 1;
    const stats = emptyStats();
    const runId = await startIngestionRun(supabase, tenantId);

    try {
      for (const feed of tenantFeeds) {
        await pollFeed(supabase, feed, stats);
      }
      await finishIngestionRun(supabase, runId, stats, "completed");
      summary.runs.push({ tenantId, runId, stats });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Signal ingest failed.";
      stats.errors.push(message);
      await finishIngestionRun(supabase, runId, stats, "failed", message);
      summary.runs.push({ tenantId, runId, stats });
    }
  }

  return summary;
}

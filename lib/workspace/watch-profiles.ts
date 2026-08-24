import type {
  WatchCriterion,
  WatchCriterionType,
  WatchFeed,
  WatchProfile,
} from "@/domains/signals/types";
import {
  normalizeCriterionValue,
  parseCriteriaJson,
  parseFeedsJson,
  type WatchCriterionInput,
  type WatchFeedInput,
} from "@/lib/signals/watch-profile-input";

export {
  normalizeCriterionValue,
  parseCriteriaJson,
  parseFeedsJson,
  type WatchCriterionInput,
  type WatchFeedInput,
};

export const WATCH_CRITERION_TYPES: {
  id: WatchCriterionType;
  label: string;
}[] = [
  { id: "topic", label: "Topic" },
  { id: "keyword", label: "Keyword" },
  { id: "entity", label: "Entity" },
  { id: "company", label: "Company" },
  { id: "competitor", label: "Competitor" },
  { id: "technology", label: "Technology" },
  { id: "product", label: "Product" },
  { id: "industry", label: "Industry" },
  { id: "regulatory_body", label: "Regulatory body" },
  { id: "organization", label: "Organization" },
  { id: "market_category", label: "Market category" },
  { id: "geography", label: "Geography" },
  { id: "domain", label: "Domain" },
  { id: "exclusion", label: "Exclusion" },
];

export function criterionTypeLabel(type: WatchCriterionType): string {
  return WATCH_CRITERION_TYPES.find((t) => t.id === type)?.label ?? type;
}

export type WatchProfileRow = {
  id: string;
  tenant_id: string;
  mission_id: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type WatchCriterionRow = {
  id: string;
  tenant_id: string;
  watch_profile_id: string;
  criterion_type: string;
  value: string;
  value_normalized: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WatchFeedRow = {
  id: string;
  tenant_id: string;
  watch_profile_id: string;
  feed_type: string;
  feed_url: string;
  label: string | null;
  enabled: boolean;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type WatchProfileListItem = WatchProfile & {
  criteriaCount: number;
  feedsCount: number;
};

export type WatchProfileDetail = WatchProfile & {
  criteria: WatchCriterion[];
  feeds: WatchFeed[];
};

export function mapWatchProfileRow(row: WatchProfileRow): WatchProfile {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    missionId: row.mission_id,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    config: row.config ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapWatchCriterionRow(row: WatchCriterionRow): WatchCriterion {
  return {
    id: row.id,
    criterionType: row.criterion_type as WatchCriterionType,
    value: row.value,
    valueNormalized: row.value_normalized,
    metadata: row.metadata ?? {},
  };
}

export function mapWatchFeedRow(row: WatchFeedRow): WatchFeed {
  return {
    id: row.id,
    feedType: row.feed_type as WatchFeed["feedType"],
    feedUrl: row.feed_url,
    label: row.label,
    enabled: row.enabled,
    lastFetchedAt: row.last_fetched_at,
  };
}

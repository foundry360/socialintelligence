import type { TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

/** Learning-loop events — Phase 4+. Engagement alone is not success. */

export type PerformanceMetricKind =
  | "awareness"
  | "authority"
  | "engagement"
  | "search_visibility"
  | "ai_visibility"
  | "commercial_relevance"
  | "pipeline_influence";

export interface PerformanceEvent extends TenantScoped, Timestamps {
  id: UUID;
  draftId?: UUID | null;
  opportunityId?: UUID | null;
  kind: PerformanceMetricKind;
  source: string;
  value: number;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

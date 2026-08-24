import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

/** External artifact type (Tier 1 — signal_sources). Not library knowledge. */
export type ExternalSignalSourceType = "rss" | "news_api" | "web" | "other";

export type SignalSourceAuthorityLevel =
  | "unknown"
  | "low"
  | "medium"
  | "high"
  | "primary";

export type SignalSourceProcessingStatus =
  | "pending"
  | "clustered"
  | "ignored"
  | "failed";

export interface SignalSource extends TenantScoped, Timestamps {
  id: UUID;
  missionId: UUID;
  watchProfileId: UUID;
  watchFeedId?: UUID | null;
  title: string;
  description: string;
  url: string;
  canonicalUrl: string;
  publisher: string;
  author?: string | null;
  publishedAt?: string | null;
  ingestedAt: string;
  sourceType: ExternalSignalSourceType;
  domain: string;
  authorityLevel: SignalSourceAuthorityLevel;
  contentHash: string;
  urlFingerprint: string;
  rawPayload: Record<string, unknown>;
  processingStatus: SignalSourceProcessingStatus;
}

export type CandidateSignalStatus =
  | "pending"
  | "qualifying"
  | "qualified"
  | "rejected"
  | "expired"
  | "merged";

export type CandidateSourceLinkReason =
  | "initial"
  | "same_url"
  | "near_duplicate"
  | "same_event"
  | "corroboration";

export interface CandidateSignal extends TenantScoped, Timestamps {
  id: UUID;
  missionId: UUID;
  watchProfileId?: UUID | null;
  title: string;
  eventFingerprint: string;
  canonicalEventKey?: string | null;
  status: CandidateSignalStatus;
  sourceCount: number;
  clusterConfidence?: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export type QualifiedSignalType =
  | "event"
  | "announcement"
  | "trend"
  | "regulatory"
  | "competitive"
  | "technology"
  | "market"
  | "conversation"
  | "other";

export type QualifiedSignalStatus = "active" | "archived" | "superseded";

export type SignalDisposition =
  | "ignore"
  | "monitor"
  | "research"
  | "discuss"
  | "develop_pov"
  | "opportunity";

export interface SignalScoreBreakdown {
  relevance?: number;
  authority?: number;
  impact?: number;
  timeliness?: number;
  differentiation?: number;
}

export interface QualifiedSignal extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  missionId: UUID;
  candidateSignalId: UUID;
  watchProfileId?: UUID | null;
  title: string;
  summary: string;
  signalType: QualifiedSignalType;
  status: QualifiedSignalStatus;
  workflowState: string;
  latestQualificationId?: UUID | null;
  qualifiedAt: string;
}

export interface SignalQualification extends TenantScoped {
  id: UUID;
  candidateSignalId: UUID;
  qualifiedSignalId?: UUID | null;
  version: number;
  isMeaningful: boolean;
  whatHappened: string;
  whyItMatters: string;
  whoIsAffected: string[];
  isNewDevelopment?: boolean | null;
  relevanceRationale: string;
  authorityRationale: string;
  differentiationRationale: string;
  timelinessRationale: string;
  recommendedAction: string;
  disposition: SignalDisposition;
  confidence?: number | null;
  scores: SignalScoreBreakdown;
  overallScore?: number | null;
  personaIds: UUID[];
  capabilityIds: UUID[];
  povIds: UUID[];
  structuredResult: Record<string, unknown>;
  modelProvider?: string | null;
  modelName?: string | null;
  promptName?: string | null;
  promptVersion?: string | null;
  qualifiedAt: string;
  createdAt: string;
}

export type WatchCriterionType =
  | "topic"
  | "keyword"
  | "entity"
  | "company"
  | "competitor"
  | "technology"
  | "product"
  | "industry"
  | "regulatory_body"
  | "organization"
  | "market_category"
  | "geography"
  | "domain"
  | "exclusion";

export type WatchFeedType = "rss" | "news_api" | "atom";

export interface WatchCriterion {
  id: UUID;
  criterionType: WatchCriterionType;
  value: string;
  valueNormalized: string;
  metadata: Record<string, unknown>;
}

export interface WatchFeed {
  id: UUID;
  feedType: WatchFeedType;
  feedUrl: string;
  label?: string | null;
  enabled: boolean;
  lastFetchedAt?: string | null;
}

export interface WatchProfile extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  missionId: UUID;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdBy?: UUID | null;
}

/** @deprecated Use QualifiedSignal. Kept for intelligence layer stub compatibility. */
export type Signal = QualifiedSignal;

/** @deprecated Use SignalQualification. */
export interface SignalAnalysis extends TenantScoped, Timestamps {
  id: UUID;
  signalId: UUID;
  summary: string;
  whyItMatters: string;
  affectedParties: string[];
  relevanceToTenant: boolean;
  relevanceScore: number;
  personaIds: UUID[];
  capabilityIds: UUID[];
  povIds: UUID[];
  differentiatedAngle?: string;
  contentWorthy: boolean;
  rationale: string;
  modelProvider?: string;
  modelName?: string;
  promptVersion?: string;
}

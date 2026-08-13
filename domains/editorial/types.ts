import type { TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export interface EditorialScoreBreakdown {
  usefulness: number;
  originality: number;
  nonGeneric: number;
  voicePovFidelity: number;
  evidenceQuality: number;
  claimRestraint: number;
  terminologyConsistency: number;
  commercialRelevance: number;
  buyerQuestionFit: number;
  topicalAuthority: number;
  engagementReason: number;
  /** Weighted 0–100 */
  total: number;
}

export interface EditorialReview extends TenantScoped, Timestamps {
  id: UUID;
  draftId: UUID;
  score: EditorialScoreBreakdown;
  flags: string[];
  summary: string;
  passesThreshold: boolean;
  thresholdUsed: number;
  promptVersion?: string;
}

export interface ApprovalDecision extends TenantScoped, Timestamps {
  id: UUID;
  draftId: UUID;
  decidedByUserId: UUID;
  decision: "approved" | "rejected" | "changes_requested";
  notes?: string;
}

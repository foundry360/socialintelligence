import type { OpportunityScoreBreakdown } from "@/domains/opportunities/types";
import type { EditorialScoreBreakdown } from "@/domains/editorial/types";

/** Default weights — sum to 1.0. Tenant overrides later. */
export const DEFAULT_OPPORTUNITY_WEIGHTS = {
  relevance: 0.18,
  audienceFit: 0.12,
  authority: 0.14,
  differentiation: 0.16,
  timeliness: 0.1,
  commercialRelevance: 0.12,
  searchAeoGeoValue: 0.1,
  packagePotential: 0.08,
} as const;

export function totalOpportunityScore(
  dimensions: Omit<OpportunityScoreBreakdown, "total">,
  weights: typeof DEFAULT_OPPORTUNITY_WEIGHTS = DEFAULT_OPPORTUNITY_WEIGHTS,
): number {
  const total =
    dimensions.relevance * weights.relevance +
    dimensions.audienceFit * weights.audienceFit +
    dimensions.authority * weights.authority +
    dimensions.differentiation * weights.differentiation +
    dimensions.timeliness * weights.timeliness +
    dimensions.commercialRelevance * weights.commercialRelevance +
    dimensions.searchAeoGeoValue * weights.searchAeoGeoValue +
    dimensions.packagePotential * weights.packagePotential;

  return Math.round(Math.min(100, Math.max(0, total)));
}

export const DEFAULT_EDITORIAL_WEIGHTS = {
  usefulness: 0.12,
  originality: 0.12,
  nonGeneric: 0.12,
  voicePovFidelity: 0.14,
  evidenceQuality: 0.1,
  claimRestraint: 0.08,
  terminologyConsistency: 0.08,
  commercialRelevance: 0.08,
  buyerQuestionFit: 0.08,
  topicalAuthority: 0.05,
  engagementReason: 0.03,
} as const;

export function totalEditorialScore(
  dimensions: Omit<EditorialScoreBreakdown, "total">,
  weights: typeof DEFAULT_EDITORIAL_WEIGHTS = DEFAULT_EDITORIAL_WEIGHTS,
): number {
  const total =
    dimensions.usefulness * weights.usefulness +
    dimensions.originality * weights.originality +
    dimensions.nonGeneric * weights.nonGeneric +
    dimensions.voicePovFidelity * weights.voicePovFidelity +
    dimensions.evidenceQuality * weights.evidenceQuality +
    dimensions.claimRestraint * weights.claimRestraint +
    dimensions.terminologyConsistency * weights.terminologyConsistency +
    dimensions.commercialRelevance * weights.commercialRelevance +
    dimensions.buyerQuestionFit * weights.buyerQuestionFit +
    dimensions.topicalAuthority * weights.topicalAuthority +
    dimensions.engagementReason * weights.engagementReason;

  return Math.round(Math.min(100, Math.max(0, total)));
}

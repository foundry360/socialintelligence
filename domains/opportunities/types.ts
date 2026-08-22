import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export interface OpportunityScoreBreakdown {
  relevance: number;
  audienceFit: number;
  authority: number;
  differentiation: number;
  timeliness: number;
  commercialRelevance: number;
  searchAeoGeoValue: number;
  packagePotential: number;
  /** Weighted 0-100 */
  total: number;
}

export type ContentFormat =
  | "linkedin_post"
  | "linkedin_article"
  | "website_article"
  | "faq"
  | "executive_pov"
  | "aeo_qa"
  | "sales_enablement"
  | "other";

export interface ContentOpportunity extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  signalId?: UUID | null;
  title: string;
  summary: string;
  score: OpportunityScoreBreakdown;
  audiencePersonaIds: UUID[];
  povIds: UUID[];
  recommendedFormats: ContentFormat[];
  rationale: string;
  status: "draft" | "scored" | "accepted" | "rejected" | "archived";
}

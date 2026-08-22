import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export interface CompanyProfile extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  legalName: string;
  displayName: string;
  tagline?: string;
  summary: string;
  positioning: string;
  differentiators: string[];
  websiteUrl?: string;
  websiteUrls?: string[];
}

export interface Capability extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  name: string;
  description: string;
  industryIds?: UUID[];
}

export interface Industry extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  name: string;
  description: string;
}

export type ProofType =
  | "case_study"
  | "customer_outcome"
  | "success_story"
  | "certification"
  | "award"
  | "partnership"
  | "relevant_experience"
  | "statistic"
  | "research"
  | "proprietary_framework"
  | "testimonial";

export interface ProofItem extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  proofType: ProofType | string;
  title: string;
  summary: string;
}

export type BuyingStage =
  | "awareness"
  | "consideration"
  | "decision"
  | "retention";

export type QuestionPriority = "high" | "medium" | "low";

/** Market question your buyers/personas are actually asking. */
export interface MarketQuestion extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  question: string;
  personaId?: UUID;
  personaName?: string;
  topic: string;
  buyingStage: BuyingStage | string;
  priority: QuestionPriority | string;
  notes?: string;
}

export interface TerminologyEntry extends TenantScoped, Timestamps {
  id: UUID;
  preferredTerm: string;
  avoidTerms: string[];
  definition?: string;
}

export interface KnowledgeDocument extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  title: string;
  sourceType: "upload" | "url" | "manual" | "seed";
  storagePath?: string;
  url?: string;
  sensitivity: "public" | "internal" | "confidential";
  metadata: Record<string, unknown>;
}

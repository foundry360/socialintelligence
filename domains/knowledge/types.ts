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
}

export interface Capability extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  name: string;
  description: string;
  industryIds?: UUID[];
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

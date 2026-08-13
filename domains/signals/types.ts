import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export type SignalSourceType =
  | "manual"
  | "rss"
  | "news_api"
  | "linkedin"
  | "web"
  | "other";

export interface Signal extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  title: string;
  sourceType: SignalSourceType;
  sourceName?: string;
  url?: string;
  rawText: string;
  occurredAt?: string;
  fingerprint?: string;
  metadata?: Record<string, unknown>;
}

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

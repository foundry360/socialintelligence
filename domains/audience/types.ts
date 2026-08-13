import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export interface ICP extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  name: string;
  description: string;
  firmographicNotes?: string;
  qualifyingSignals?: string[];
}

export interface Persona extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  name: string;
  titlePatterns: string[];
  goals: string[];
  pains: string[];
  languageNotes?: string;
  icpIds?: UUID[];
}

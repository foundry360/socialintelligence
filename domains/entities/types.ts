import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export type EntityKind =
  | "organization"
  | "person"
  | "product"
  | "concept"
  | "industry"
  | "role"
  | "other";

export interface Topic extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  slug: string;
  name: string;
  description?: string;
  parentTopicId?: UUID | null;
}

export interface EntityNode extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  kind: EntityKind;
  name: string;
  aliases?: string[];
  description?: string;
}

export interface EntityRelationship extends TenantScoped, Timestamps {
  id: UUID;
  fromEntityId: UUID;
  toEntityId: UUID;
  relationshipType: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

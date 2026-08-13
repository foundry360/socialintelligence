import type { SoftDeletable, TenantRole, Timestamps, UUID } from "@/domains/shared/types";

export interface Tenant extends Timestamps, SoftDeletable {
  id: UUID;
  slug: string;
  name: string;
  status: "active" | "suspended";
}

export interface TenantMembership extends Timestamps {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  role: TenantRole;
}

export interface Brand extends Timestamps, SoftDeletable {
  id: UUID;
  tenantId: UUID;
  name: string;
  slug: string;
  isPrimary: boolean;
}

export interface ExecutiveVoice extends Timestamps, SoftDeletable {
  id: UUID;
  tenantId: UUID;
  brandId?: UUID | null;
  name: string;
  title?: string;
  voiceNotes?: string;
}

/** Shared branded IDs and common fields. */

export type UUID = string;

export type TenantRole = "owner" | "admin" | "editor" | "viewer";

export interface TenantScoped {
  tenantId: UUID;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeletable {
  deletedAt?: string | null;
}

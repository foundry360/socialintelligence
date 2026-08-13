import type { ContentFormat } from "@/domains/opportunities/types";
import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export type DraftStatus =
  | "generating"
  | "ready_for_editorial"
  | "awaiting_human_approval"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "published";

export interface ContentPackage extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  opportunityId: UUID;
  title: string;
  status: DraftStatus;
}

export interface ContentDraft extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  packageId: UUID;
  opportunityId: UUID;
  format: ContentFormat;
  title: string;
  body: string;
  structuredPayload?: Record<string, unknown>;
  status: DraftStatus;
  promptName?: string;
  promptVersion?: string;
  modelProvider?: string;
  modelName?: string;
}

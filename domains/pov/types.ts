import type { SoftDeletable, TenantScoped, Timestamps, UUID } from "@/domains/shared/types";

export type POVStatus = "draft" | "active" | "deprecated";

export interface PointOfView extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  topicId?: UUID | null;
  topicLabel: string;
  stance: string;
  principles: string[];
  disagreesWith: string[];
  frameworkIds?: UUID[];
  evidenceRefs?: string[];
  personaIds?: UUID[];
  capabilityIds?: UUID[];
  status: POVStatus;
  confidence: number;
}

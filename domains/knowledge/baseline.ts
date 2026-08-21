import type {
  SoftDeletable,
  TenantScoped,
  Timestamps,
  UUID,
} from "@/domains/shared/types";

export type BaselineStatus = "draft" | "awaiting_approval" | "approved" | "rejected";

export interface AuthorityBaseline extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  workspaceId?: UUID | null;
  version: number;
  status: BaselineStatus;
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
  povCoverageNotes: string;
  trustMixNotes: string;
  recommendedActions: string[];
  summary: string;
  citationSourceIds: UUID[];
  approvedByUserId?: UUID | null;
  approvedAt?: string | null;
}

export type MessagingPlanStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "rejected";

export interface MessagingPlan extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  baselineId: UUID;
  version: number;
  status: MessagingPlanStatus;
  priorityTopics: string[];
  messagingPillars: string[];
  sayList: string[];
  dontSayList: string[];
  contentThemes: string[];
  summary: string;
  approvedByUserId?: UUID | null;
  approvedAt?: string | null;
}

export interface KnowledgeWorkspace extends TenantScoped, Timestamps, SoftDeletable {
  id: UUID;
  name: string;
  isPrimary: boolean;
}

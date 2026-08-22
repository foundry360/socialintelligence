import type { AuthorityBaseline, BaselineStatus } from "@/domains/knowledge/baseline";

export type AuthorityBaselineRow = {
  id: string;
  tenant_id: string;
  workspace_id: string | null;
  version: number;
  status: BaselineStatus | "superseded";
  summary: string;
  strengths: string[] | null;
  weaknesses: string[] | null;
  gaps: string[] | null;
  pov_coverage_notes: string;
  trust_mix_notes: string;
  recommended_actions: string[] | null;
  citation_source_ids: string[] | null;
  generated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function mapBaselineRow(row: AuthorityBaselineRow): AuthorityBaseline {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    version: row.version,
    status:
      row.status === "superseded"
        ? "rejected"
        : (row.status as AuthorityBaseline["status"]),
    summary: row.summary ?? "",
    strengths: asStringArray(row.strengths),
    weaknesses: asStringArray(row.weaknesses),
    gaps: asStringArray(row.gaps),
    povCoverageNotes: row.pov_coverage_notes ?? "",
    trustMixNotes: row.trust_mix_notes ?? "",
    recommendedActions: asStringArray(row.recommended_actions),
    citationSourceIds: (row.citation_source_ids ?? []).filter(Boolean),
    approvedByUserId: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export type BaselineListItem = AuthorityBaseline & {
  rawStatus: AuthorityBaselineRow["status"];
};

export function mapBaselineListItem(row: AuthorityBaselineRow): BaselineListItem {
  const mapped = mapBaselineRow(row);
  return { ...mapped, rawStatus: row.status };
}

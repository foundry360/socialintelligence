export type MissionRow = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  source_count: number;
  sort_order: number;
  created_by: string | null;
  project_lead_id: string | null;
};

export const MISSION_DESCRIPTION_MAX_LENGTH = 160;

export function reorderMissionIds(
  order: string[],
  draggedId: string,
  targetId: string,
): string[] {
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function formatMissionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

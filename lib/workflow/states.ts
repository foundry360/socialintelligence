/**
 * Signal → intelligence → content → approval workflow states.
 * Publish is intentionally future-only.
 */

export type WorkflowState =
  | "signal.received"
  | "signal.analyzed"
  | "opportunity.draft"
  | "opportunity.scored"
  | "package.generating"
  | "package.ready_for_editorial"
  | "editorial.scored"
  | "awaiting_human_approval"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "published";

const ALLOWED: Record<WorkflowState, WorkflowState[]> = {
  "signal.received": ["signal.analyzed", "rejected"],
  "signal.analyzed": ["opportunity.draft", "rejected"],
  "opportunity.draft": ["opportunity.scored", "rejected"],
  "opportunity.scored": ["package.generating", "rejected"],
  "package.generating": ["package.ready_for_editorial"],
  "package.ready_for_editorial": ["editorial.scored"],
  "editorial.scored": ["awaiting_human_approval", "rejected"],
  awaiting_human_approval: ["approved", "rejected", "changes_requested"],
  approved: ["published"],
  rejected: [],
  changes_requested: ["package.generating", "awaiting_human_approval"],
  published: [],
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: WorkflowState, to: WorkflowState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid workflow transition: ${from} → ${to}`);
  }
}

/** MVP stops at human approval; publishing is disabled until Phase 4. */
export const MVP_TERMINAL_STATES: WorkflowState[] = [
  "approved",
  "rejected",
  "changes_requested",
];

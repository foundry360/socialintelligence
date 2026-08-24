import type { AuthorityBaseline } from "@/domains/knowledge/baseline";

export function formatApprovedBaselineSummary(
  baseline: Pick<
    AuthorityBaseline,
    | "version"
    | "summary"
    | "strengths"
    | "weaknesses"
    | "gaps"
    | "povCoverageNotes"
    | "trustMixNotes"
    | "recommendedActions"
  >,
): string {
  const lines = [
    `Authority Baseline v${baseline.version} (approved)`,
    baseline.summary.trim() ? `Summary: ${baseline.summary.trim()}` : null,
    baseline.strengths.length
      ? `Strengths: ${baseline.strengths.join("; ")}`
      : null,
    baseline.weaknesses.length
      ? `Weaknesses: ${baseline.weaknesses.join("; ")}`
      : null,
    baseline.gaps.length ? `Gaps: ${baseline.gaps.join("; ")}` : null,
    baseline.povCoverageNotes.trim()
      ? `POV coverage: ${baseline.povCoverageNotes.trim()}`
      : null,
    baseline.trustMixNotes.trim()
      ? `Trust mix: ${baseline.trustMixNotes.trim()}`
      : null,
    baseline.recommendedActions.length
      ? `Recommended actions: ${baseline.recommendedActions.join("; ")}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export function mergeTenantKnowledgeForLlm(
  structuredKnowledge: string,
  baselineSummary: string,
): string {
  const structured = structuredKnowledge.trim();
  const baseline = baselineSummary.trim();

  if (!structured && !baseline) {
    return "(No structured profile yet.)";
  }
  if (!baseline) {
    return structured || "(No structured profile yet.)";
  }
  if (!structured) {
    return `## Approved authority baseline\n${baseline}`;
  }

  return `${structured}\n\n## Approved authority baseline\n${baseline}`;
}

export function formatProjectMissionFocus(input: {
  title: string;
  description: string;
}): string {
  return [
    "MISSION FOCUS (stay on this topic while using tenant knowledge and evidence):",
    `Title: ${input.title}`,
    input.description.trim()
      ? `Focus: ${input.description.trim()}`
      : "Focus: Use the conversation to explore this topic in depth.",
  ].join("\n");
}

export function formatWatchProfilesSummary(
  profiles: {
    name: string;
    enabled: boolean;
    criteriaCount: number;
    feedsCount: number;
  }[],
): string {
  if (profiles.length === 0) {
    return "Watch profiles: none configured.";
  }

  const lines = profiles.map((profile) => {
    const status = profile.enabled ? "enabled" : "disabled";
    return `- ${profile.name} (${status}): ${profile.criteriaCount} criteria, ${profile.feedsCount} feeds`;
  });

  return ["Watch profiles:", ...lines].join("\n");
}

export function formatProjectContextBlock(
  missionFocus: string,
  watchProfilesSummary: string,
): string {
  return `${missionFocus}\n\n${watchProfilesSummary}`;
}

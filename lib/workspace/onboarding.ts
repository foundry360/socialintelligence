export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export function buildOnboardingSteps(input: {
  knowledgeReady: boolean;
  evidenceReady: boolean;
  baselineApproved: boolean;
  teamReady: boolean;
  hasProject: boolean;
}): OnboardingStep[] {
  return [
    {
      id: "knowledge",
      label: "Complete structured knowledge",
      description: "Fill every Knowledge category so claims stay company-true.",
      href: "/workspace/knowledge",
      done: input.knowledgeReady,
    },
    {
      id: "evidence",
      label: "Add accepted evidence",
      description: "Upload sources in My Library and mark them accepted.",
      href: "/workspace/library",
      done: input.evidenceReady,
    },
    {
      id: "baseline",
      label: "Approve your Authority Baseline",
      description: "Generate a baseline from knowledge, then review and approve v1.",
      href: "/workspace/knowledge?baseline=1",
      done: input.baselineApproved,
    },
    {
      id: "team",
      label: "Invite a teammate",
      description: "Bring in colleagues to build knowledge and review baselines.",
      href: "/workspace/settings/team",
      done: input.teamReady,
    },
    {
      id: "project",
      label: "Create your first project",
      description: "Start a focused workspace for a topic or initiative.",
      href: "/workspace",
      done: input.hasProject,
    },
  ];
}

export function onboardingProgress(steps: OnboardingStep[]) {
  const complete = steps.filter((step) => step.done).length;
  const incomplete = steps.length - complete;
  const firstIncomplete = steps.find((step) => !step.done) ?? null;
  return { complete, incomplete, total: steps.length, firstIncomplete };
}

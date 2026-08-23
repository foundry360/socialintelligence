import type { ReactNode } from "react";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import { getWorkspaceOnboardingSteps } from "@/lib/workspace/get-onboarding-steps";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return children;
  }

  const ctx = await requireWorkspaceContext();
  const steps = await getWorkspaceOnboardingSteps(ctx.tenantId);

  return (
    <>
      {children}
      <OnboardingChecklist steps={steps} />
    </>
  );
}

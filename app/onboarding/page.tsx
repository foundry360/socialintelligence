import { redirect } from "next/navigation";
import { getSessionUser, listMembershipsForUser } from "@/lib/auth/session";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const memberships = await listMembershipsForUser(user.id);
  if (memberships.length > 0) {
    redirect("/workspace");
  }

  const params = await searchParams;
  const error = params.error ? String(params.error) : null;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[400px] flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm text-muted">
          <span className="font-bold text-foreground">X</span>
          <span className="font-medium text-foreground">2</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm text-muted">
          Finish setting up your organization. This is usually done when you
          create an account; use this only if that step was skipped.
        </p>
      </div>
      <OnboardingForm error={error} />
    </main>
  );
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, listMembershipsForUser } from "@/lib/auth/session";
import { provisionTenantForUser } from "@/lib/auth/provision-tenant";
import { acceptPendingInvitesForUser } from "@/lib/tenancy/accept-invites";

export type ProvisionResult =
  | { ok: true }
  | { ok: false; error: string; code?: "unauthenticated" | "already_member" };

/** Provision org for the signed-in user (used from signup and onboarding). */
export async function provisionCurrentUserOrganization(
  organizationName: string,
): Promise<ProvisionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "unauthenticated" };
  }

  const memberships = await listMembershipsForUser(user.id);
  if (memberships.length > 0) {
    return { ok: false, error: "Already in a workspace.", code: "already_member" };
  }

  try {
    await provisionTenantForUser({
      userId: user.id,
      organizationName,
    });
    revalidatePath("/workspace");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create workspace",
    };
  }
}

/**
 * After sign-in: use a pending org name from signup (email-confirm path),
 * or send the user to onboarding if they still have no membership.
 */
export async function resolvePostAuthPath(
  pendingOrganizationName?: string | null,
): Promise<"/workspace" | "/onboarding"> {
  const user = await getSessionUser();
  if (!user) return "/onboarding";

  if (user.email) {
    await acceptPendingInvitesForUser({
      userId: user.id,
      email: user.email,
    }).catch(() => undefined);
  }

  const memberships = await listMembershipsForUser(user.id);
  if (memberships.length > 0) return "/workspace";

  const name = pendingOrganizationName?.trim();
  if (name && name.length >= 2) {
    const result = await provisionCurrentUserOrganization(name);
    if (result.ok || result.code === "already_member") return "/workspace";
  }

  return "/onboarding";
}

export async function createOrganizationAction(formData: FormData) {
  const organizationName = String(formData.get("organization_name") ?? "");
  const result = await provisionCurrentUserOrganization(organizationName);
  if (!result.ok) {
    if (result.code === "unauthenticated") {
      redirect("/login?next=/onboarding");
    }
    if (result.code === "already_member") {
      redirect("/workspace");
    }
    redirect(`/onboarding?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/workspace");
}

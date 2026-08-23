"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { TenantRole } from "@/domains/shared/types";
import { requireTenantAdmin } from "@/lib/auth/require-tenant-admin";
import { createServiceClient } from "@/lib/db/supabase";
import {
  ASSIGNABLE_ROLES,
  inviteUserToTenant,
} from "@/lib/tenancy/team";

export type TeamActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function inviteTeamMember(
  formData: FormData,
): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenantAdmin();
    const email = String(formData.get("email") ?? "").trim();
    const role = String(formData.get("role") ?? "viewer") as TenantRole;

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return { ok: false, error: "Invalid role." };
    }

    const result = await inviteUserToTenant({
      tenantId: ctx.tenantId,
      tenantName: ctx.tenantName,
      inviterEmail: ctx.user.email ?? "A teammate",
      email,
      role,
      invitedByUserId: ctx.user.id,
      siteOrigin: await siteOrigin(),
    });

    revalidatePath("/workspace/settings/team");
    return {
      ok: true,
      message:
        result.status === "added"
          ? "User added to the team."
          : "Invitation sent by email.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not invite user.",
    };
  }
}

export async function updateTeamMemberRole(
  membershipId: string,
  role: TenantRole,
): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenantAdmin();
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return { ok: false, error: "Invalid role." };
    }

    const service = createServiceClient();
    const { data: target, error: fetchError } = await service
      .from("tenant_memberships")
      .select("id, user_id, role, tenant_id")
      .eq("id", membershipId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();

    if (fetchError) return { ok: false, error: fetchError.message };
    if (!target) return { ok: false, error: "Member not found." };
    if (target.role === "owner") {
      return { ok: false, error: "Owner role cannot be changed here." };
    }
    if (target.user_id === ctx.user.id && ctx.role === "admin") {
      return { ok: false, error: "Admins cannot change their own role." };
    }

    const { error } = await service
      .from("tenant_memberships")
      .update({ role })
      .eq("id", membershipId)
      .eq("tenant_id", ctx.tenantId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/workspace/settings/team");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update role.",
    };
  }
}

export async function removeTeamMember(
  membershipId: string,
): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenantAdmin();

    const service = createServiceClient();
    const { data: target, error: fetchError } = await service
      .from("tenant_memberships")
      .select("id, user_id, role, tenant_id")
      .eq("id", membershipId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();

    if (fetchError) return { ok: false, error: fetchError.message };
    if (!target) return { ok: false, error: "Member not found." };
    if (target.user_id === ctx.user.id) {
      return { ok: false, error: "You cannot remove yourself." };
    }
    if (target.role === "owner") {
      return { ok: false, error: "Owners cannot be removed." };
    }

    const { error } = await service
      .from("tenant_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("tenant_id", ctx.tenantId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/workspace/settings/team");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not remove member.",
    };
  }
}

export async function cancelTeamInvite(
  inviteId: string,
): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenantAdmin();
    const service = createServiceClient();

    const { error } = await service
      .from("tenant_invites")
      .delete()
      .eq("id", inviteId)
      .eq("tenant_id", ctx.tenantId)
      .is("accepted_at", null);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/workspace/settings/team");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not cancel invite.",
    };
  }
}

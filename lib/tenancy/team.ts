import "server-only";

import type { TenantRole } from "@/domains/shared/types";
import { createServiceClient } from "@/lib/db/supabase";
import {
  sendTeamAddedEmail,
  sendTeamInviteEmail,
} from "@/lib/email/send-team-invite";
import { isResendConfigured } from "@/lib/email/resend";
import {
  ASSIGNABLE_ROLES,
  type PendingInvite,
  type TeamMember,
} from "@/lib/tenancy/team-shared";

export type { PendingInvite, TeamMember } from "@/lib/tenancy/team-shared";
export { ASSIGNABLE_ROLES, roleLabel } from "@/lib/tenancy/team-shared";

async function findUserIdByEmail(
  service: ReturnType<typeof createServiceClient>,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );
    if (match) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

export async function listTenantMembers(
  tenantId: string,
): Promise<TeamMember[]> {
  const service = createServiceClient();

  const { data: rows, error } = await service
    .from("tenant_memberships")
    .select("id, user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const members: TeamMember[] = [];
  for (const row of rows ?? []) {
    const { data: userData, error: userError } =
      await service.auth.admin.getUserById(row.user_id);
    if (userError) continue;

    const metadata = userData.user.user_metadata as
      | Record<string, unknown>
      | undefined;
    const avatarUrl =
      typeof metadata?.avatar_url === "string" ? metadata.avatar_url : null;

    members.push({
      id: row.id,
      userId: row.user_id,
      email: userData.user.email ?? "Unknown",
      avatarUrl,
      role: row.role as TenantRole,
      createdAt: row.created_at,
    });
  }

  return members;
}

export async function listPendingInvites(
  tenantId: string,
): Promise<PendingInvite[]> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("tenant_invites")
    .select("id, email, role, created_at")
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as TenantRole,
    createdAt: row.created_at,
  }));
}

export async function inviteUserToTenant(input: {
  tenantId: string;
  tenantName: string;
  inviterEmail: string;
  email: string;
  role: TenantRole;
  invitedByUserId: string;
  siteOrigin: string;
}): Promise<{ status: "added" | "invited" }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  if (!ASSIGNABLE_ROLES.includes(input.role)) {
    throw new Error("Invalid role for invite.");
  }

  const service = createServiceClient();

  const existingUserId = await findUserIdByEmail(service, email);
  if (existingUserId) {
    const { data: membership } = await service
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("user_id", existingUserId)
      .maybeSingle();

    if (membership) {
      throw new Error("This user is already a team member.");
    }

    const { error } = await service.from("tenant_memberships").insert({
      tenant_id: input.tenantId,
      user_id: existingUserId,
      role: input.role,
    });
    if (error) throw new Error(error.message);

    await service
      .from("tenant_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("tenant_id", input.tenantId)
      .ilike("email", email)
      .is("accepted_at", null);

    if (isResendConfigured()) {
      await sendTeamAddedEmail({
        to: email,
        tenantName: input.tenantName,
        inviterEmail: input.inviterEmail,
        role: input.role,
        workspaceUrl: `${input.siteOrigin}/workspace`,
      }).catch(() => undefined);
    }

    return { status: "added" };
  }

  const { error: inviteRowError } = await service.from("tenant_invites").upsert(
    {
      tenant_id: input.tenantId,
      email,
      role: input.role,
      invited_by: input.invitedByUserId,
      accepted_at: null,
    },
    { onConflict: "tenant_id,email" },
  );
  if (inviteRowError) throw new Error(inviteRowError.message);

  const redirectTo = `${input.siteOrigin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  if (isResendConfigured()) {
    const { data: linkData, error: linkError } =
      await service.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo,
          data: {
            tenant_id: input.tenantId,
            invited_role: input.role,
          },
        },
      });

    if (linkError) throw new Error(linkError.message);

    const acceptUrl = linkData.properties.action_link;
    if (!acceptUrl) {
      throw new Error("Could not create invite link.");
    }

    try {
      await sendTeamInviteEmail({
        to: email,
        tenantName: input.tenantName,
        inviterEmail: input.inviterEmail,
        role: input.role,
        acceptUrl,
      });
    } catch (err) {
      await service
        .from("tenant_invites")
        .delete()
        .eq("tenant_id", input.tenantId)
        .ilike("email", email)
        .is("accepted_at", null);
      throw err;
    }

    return { status: "invited" };
  }

  const { error: inviteError } = await service.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: {
        tenant_id: input.tenantId,
        invited_role: input.role,
      },
    },
  );

  if (inviteError) {
    await service
      .from("tenant_invites")
      .delete()
      .eq("tenant_id", input.tenantId)
      .ilike("email", email)
      .is("accepted_at", null);
    throw new Error(inviteError.message);
  }

  return { status: "invited" };
}

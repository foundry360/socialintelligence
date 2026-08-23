import { WorkspaceShell } from "@/components/workspace-shell";
import { TeamPanel } from "@/components/team-panel";
import { requireWorkspaceContext } from "@/lib/auth/workspace";
import { isTenantAdmin } from "@/lib/auth/require-tenant-admin";
import type { TenantRole } from "@/domains/shared/types";
import {
  listPendingInvites,
  listTenantMembers,
} from "@/lib/tenancy/team";

export default async function TeamSettingsPage() {
  const ctx = await requireWorkspaceContext();
  const canManage = isTenantAdmin(ctx.role);

  const [members, invites] = await Promise.all([
    listTenantMembers(ctx.tenantId),
    canManage ? listPendingInvites(ctx.tenantId) : Promise.resolve([]),
  ]);

  return (
    <WorkspaceShell
      tenantName={ctx.tenantName}
      email={ctx.user.email}
      role={ctx.role}
      avatarUrl={
        typeof ctx.user.user_metadata?.avatar_url === "string"
          ? ctx.user.user_metadata.avatar_url
          : null
      }
    >
      <TeamPanel
        members={members}
        invites={invites}
        currentUserId={ctx.user.id}
        currentUserRole={ctx.role as TenantRole}
        canManage={canManage}
      />
    </WorkspaceShell>
  );
}

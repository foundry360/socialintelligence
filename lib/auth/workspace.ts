import "server-only";

import { redirect } from "next/navigation";
import {
  getSessionUser,
  listMembershipsForUser,
  type MembershipRow,
} from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import type { User } from "@supabase/supabase-js";

export type WorkspaceContext = {
  user: User;
  membership: MembershipRow;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  workspaceId: string | null;
  workspaceName: string | null;
};

export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/workspace");
  }

  const memberships = await listMembershipsForUser(user.id);
  const membership = memberships[0];
  if (!membership) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const { data: ws } = await supabase
    .from("knowledge_workspaces")
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .eq("is_primary", true)
    .maybeSingle();

  return {
    user,
    membership,
    tenantId: membership.tenant_id || membership.tenants?.id || "",
    tenantName: membership.tenants?.name ?? "Tenant",
    tenantSlug: membership.tenants?.slug ?? "",
    role: membership.role,
    workspaceId: ws?.id ?? null,
    workspaceName: ws?.name ?? null,
  };
}

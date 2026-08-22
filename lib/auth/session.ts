import "server-only";

import { createClient } from "@/lib/db/server";
import type { TenantRole } from "@/domains/shared/types";

export type MembershipRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  tenants: {
    id: string;
    slug: string;
    name: string;
    status: string;
  } | null;
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function listMembershipsForUser(
  userId: string,
): Promise<MembershipRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_memberships")
    .select(
      "id, tenant_id, user_id, role, tenants ( id, slug, name, status )",
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load memberships: ${error.message}`);
  }

  return (data ?? []) as unknown as MembershipRow[];
}

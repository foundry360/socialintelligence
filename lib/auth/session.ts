import "server-only";

import { createClient } from "@/lib/db/server";
import { createServiceClient } from "@/lib/db/supabase";
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

/**
 * If the user has no memberships and BOOTSTRAP_TENANT_SLUG is set,
 * attach them as owner (service role). Used for first Kona Kai onboarding.
 */
export async function ensureBootstrapMembership(userId: string): Promise<void> {
  const slug = process.env.BOOTSTRAP_TENANT_SLUG;
  if (!slug) return;

  const existing = await listMembershipsForUser(userId);
  if (existing.length > 0) return;

  const service = createServiceClient();
  const { data: tenant, error: tenantError } = await service
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (tenantError || !tenant) {
    throw new Error(
      `Bootstrap tenant '${slug}' not found. Apply supabase/seed.sql.`,
    );
  }

  const { error } = await service.from("tenant_memberships").upsert(
    {
      tenant_id: tenant.id,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "tenant_id,user_id" },
  );

  if (error) {
    throw new Error(`Failed to bootstrap membership: ${error.message}`);
  }
}

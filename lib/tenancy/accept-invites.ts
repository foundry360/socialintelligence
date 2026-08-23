import "server-only";

import { createServiceClient } from "@/lib/db/supabase";
import type { TenantRole } from "@/domains/shared/types";

const INVITE_ROLES = new Set<TenantRole>(["admin", "editor", "viewer"]);

/**
 * Accept pending tenant invites for the signed-in user's email.
 * Called after auth callback / sign-in.
 */
export async function acceptPendingInvitesForUser(input: {
  userId: string;
  email: string;
}): Promise<number> {
  const email = input.email.trim().toLowerCase();
  if (!email) return 0;

  const service = createServiceClient();

  const { data: invites, error } = await service
    .from("tenant_invites")
    .select("id, tenant_id, role")
    .ilike("email", email)
    .is("accepted_at", null);

  if (error) throw new Error(error.message);
  if (!invites?.length) return 0;

  let accepted = 0;
  for (const invite of invites) {
    const role = invite.role as TenantRole;
    if (!INVITE_ROLES.has(role)) continue;

    const { data: existing } = await service
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", invite.tenant_id)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await service
        .from("tenant_memberships")
        .insert({
          tenant_id: invite.tenant_id,
          user_id: input.userId,
          role,
        });
      if (insertError) continue;
    }

    await service
      .from("tenant_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    accepted += 1;
  }

  return accepted;
}

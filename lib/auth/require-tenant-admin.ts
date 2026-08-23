import "server-only";

import {
  requireWorkspaceContext,
  type WorkspaceContext,
} from "@/lib/auth/workspace";

export async function requireTenantAdmin(
  ctx?: WorkspaceContext,
): Promise<WorkspaceContext> {
  const context = ctx ?? (await requireWorkspaceContext());
  if (context.role !== "owner" && context.role !== "admin") {
    throw new Error("Only owners and admins can manage team members.");
  }
  return context;
}

export function isTenantAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

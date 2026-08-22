import "server-only";

import { createServiceClient } from "@/lib/db/supabase";

function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "workspace";
}

async function uniqueTenantSlug(
  service: ReturnType<typeof createServiceClient>,
  preferred: string,
): Promise<string> {
  const base = slugify(preferred);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate =
      attempt === 0
        ? base
        : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await service
      .from("tenants")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type ProvisionedTenant = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  workspaceId: string;
};

/**
 * Create a new tenant + primary workspace + brand + empty company profile,
 * and attach the user as owner. Uses service role (RLS has no public inserts).
 */
export async function provisionTenantForUser(input: {
  userId: string;
  organizationName: string;
}): Promise<ProvisionedTenant> {
  const name = input.organizationName.trim();
  if (name.length < 2) {
    throw new Error("Organization name must be at least 2 characters.");
  }

  const service = createServiceClient();

  const { data: existing } = await service
    .from("tenant_memberships")
    .select("id")
    .eq("user_id", input.userId)
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error("You already belong to a workspace.");
  }

  const slug = await uniqueTenantSlug(service, name);

  const { data: tenant, error: tenantError } = await service
    .from("tenants")
    .insert({ slug, name, status: "active" })
    .select("id, slug, name")
    .single();
  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? "Failed to create tenant");
  }

  const brandSlug = slugify(name);
  const { error: brandError } = await service.from("brands").insert({
    tenant_id: tenant.id,
    name,
    slug: brandSlug,
    is_primary: true,
  });
  if (brandError) {
    await service.from("tenants").delete().eq("id", tenant.id);
    throw new Error(brandError.message);
  }

  const { data: workspace, error: workspaceError } = await service
    .from("knowledge_workspaces")
    .insert({
      tenant_id: tenant.id,
      name: `${name} Workspace`,
      is_primary: true,
    })
    .select("id")
    .single();
  if (workspaceError || !workspace) {
    await service.from("tenants").delete().eq("id", tenant.id);
    throw new Error(workspaceError?.message ?? "Failed to create workspace");
  }

  const { error: profileError } = await service.from("company_profiles").insert({
    tenant_id: tenant.id,
    legal_name: name,
    display_name: name,
    summary: "",
    positioning: "",
    differentiators: [],
  });
  if (profileError) {
    await service.from("tenants").delete().eq("id", tenant.id);
    throw new Error(profileError.message);
  }

  const { error: membershipError } = await service
    .from("tenant_memberships")
    .insert({
      tenant_id: tenant.id,
      user_id: input.userId,
      role: "owner",
    });
  if (membershipError) {
    await service.from("tenants").delete().eq("id", tenant.id);
    throw new Error(membershipError.message);
  }

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    workspaceId: workspace.id,
  };
}

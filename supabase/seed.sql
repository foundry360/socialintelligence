-- Seed Kona Kai Corp as first tenant.
-- Apply after migrations. Safe to re-run (upserts on slug / unique keys).

-- Fixed IDs for local/dev consistency
-- tenant:  a0000000-0000-4000-8000-000000000001
-- brand:   a0000000-0000-4000-8000-000000000002
-- workspace: a0000000-0000-4000-8000-000000000003
-- profile: a0000000-0000-4000-8000-000000000004

insert into public.tenants (id, slug, name, status)
values (
  'a0000000-0000-4000-8000-000000000001',
  'kona-kai',
  'Kona Kai Corp',
  'active'
)
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      updated_at = now(),
      deleted_at = null;

insert into public.brands (id, tenant_id, name, slug, is_primary)
values (
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Kona Kai',
  'kona-kai',
  true
)
on conflict (tenant_id, slug) do update
  set name = excluded.name,
      is_primary = excluded.is_primary,
      updated_at = now(),
      deleted_at = null;

insert into public.knowledge_workspaces (id, tenant_id, name, is_primary)
values (
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'Kona Kai Authority Workspace',
  true
)
on conflict (id) do update
  set name = excluded.name,
      is_primary = excluded.is_primary,
      updated_at = now(),
      deleted_at = null;

insert into public.company_profiles (
  id,
  tenant_id,
  legal_name,
  display_name,
  tagline,
  summary,
  positioning,
  differentiators,
  website_url
)
values (
  'a0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  'Kona Kai Corp',
  'Kona Kai',
  null,
  '',
  '',
  '[]'::jsonb,
  null
)
on conflict (tenant_id) do update
  set legal_name = excluded.legal_name,
      display_name = excluded.display_name,
      updated_at = now(),
      deleted_at = null;

-- POVs are curated in the Knowledge Workspace (no seed POV).

-- ---------------------------------------------------------------------------
-- Link a Supabase Auth user to Kona Kai (run after the user exists):
--
--   insert into public.tenant_memberships (tenant_id, user_id, role)
--   values (
--     'a0000000-0000-4000-8000-000000000001',
--     '<auth.users.id>',
--     'owner'
--   )
--   on conflict (tenant_id, user_id) do nothing;
--
-- Or sign up while BOOTSTRAP_TENANT_SLUG=kona-kai is set in the app env;
-- the app will auto-create an owner membership for the first linked user flow.
-- ---------------------------------------------------------------------------

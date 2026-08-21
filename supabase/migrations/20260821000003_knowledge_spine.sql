-- Minimal knowledge spine for Phase 1 seed + Phase 2 expansion

create table public.knowledge_workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index knowledge_workspaces_tenant_id_idx
  on public.knowledge_workspaces (tenant_id);

create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  legal_name text not null,
  display_name text not null,
  tagline text,
  summary text not null default '',
  positioning text not null default '',
  differentiators jsonb not null default '[]'::jsonb,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id)
);

create table public.capabilities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.points_of_view (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  topic_label text not null,
  stance text not null,
  principles jsonb not null default '[]'::jsonb,
  disagrees_with jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'deprecated')),
  confidence numeric not null default 0.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger knowledge_workspaces_set_updated_at
before update on public.knowledge_workspaces
for each row execute function public.set_updated_at();

create trigger company_profiles_set_updated_at
before update on public.company_profiles
for each row execute function public.set_updated_at();

create trigger capabilities_set_updated_at
before update on public.capabilities
for each row execute function public.set_updated_at();

create trigger points_of_view_set_updated_at
before update on public.points_of_view
for each row execute function public.set_updated_at();

alter table public.knowledge_workspaces enable row level security;
alter table public.company_profiles enable row level security;
alter table public.capabilities enable row level security;
alter table public.points_of_view enable row level security;

create policy knowledge_workspaces_select_member
  on public.knowledge_workspaces for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy company_profiles_select_member
  on public.company_profiles for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy capabilities_select_member
  on public.capabilities for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy points_of_view_select_member
  on public.points_of_view for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

-- Editors+ can update structured knowledge (Phase 2 UI will use these).
create policy company_profiles_update_editors
  on public.company_profiles for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = company_profiles.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy capabilities_insert_editors
  on public.capabilities for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = capabilities.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy points_of_view_insert_editors
  on public.points_of_view for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = points_of_view.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

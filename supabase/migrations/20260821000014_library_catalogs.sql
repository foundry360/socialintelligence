-- Tenant-defined library catalog folders

alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_catalog_check;

create table if not exists public.library_catalogs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists library_catalogs_tenant_id_idx
  on public.library_catalogs (tenant_id, sort_order);

alter table public.library_catalogs enable row level security;

create policy library_catalogs_select_member
  on public.library_catalogs for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy library_catalogs_insert_editors
  on public.library_catalogs for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = library_catalogs.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy library_catalogs_update_editors
  on public.library_catalogs for update to authenticated
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = library_catalogs.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy library_catalogs_delete_editors
  on public.library_catalogs for delete to authenticated
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = library_catalogs.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

-- Many-to-many source ↔ catalog assignments

create table if not exists public.knowledge_source_catalogs (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  catalog_slug text not null,
  created_at timestamptz not null default now(),
  primary key (source_id, catalog_slug)
);

create index if not exists knowledge_source_catalogs_tenant_slug_idx
  on public.knowledge_source_catalogs (tenant_id, catalog_slug);

create index if not exists knowledge_source_catalogs_source_id_idx
  on public.knowledge_source_catalogs (source_id);

insert into public.knowledge_source_catalogs (tenant_id, source_id, catalog_slug)
select tenant_id, id, catalog
from public.knowledge_sources
where catalog is not null
  and deleted_at is null
on conflict do nothing;

alter table public.knowledge_sources
  drop column if exists catalog;

alter table public.knowledge_source_catalogs enable row level security;

create policy knowledge_source_catalogs_select_member
  on public.knowledge_source_catalogs for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy knowledge_source_catalogs_insert_editors
  on public.knowledge_source_catalogs for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = knowledge_source_catalogs.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
    and exists (
      select 1 from public.knowledge_sources ks
      where ks.id = knowledge_source_catalogs.source_id
        and ks.tenant_id = knowledge_source_catalogs.tenant_id
        and ks.deleted_at is null
    )
  );

create policy knowledge_source_catalogs_delete_editors
  on public.knowledge_source_catalogs for delete to authenticated
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = knowledge_source_catalogs.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

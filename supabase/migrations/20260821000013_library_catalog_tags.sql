-- Library catalog, metadata preview, and tenant-scoped source tags

alter table public.knowledge_sources
  add column if not exists catalog text
    check (
      catalog is null
      or catalog in (
        'evidence',
        'research',
        'competitive',
        'internal',
        'marketing',
        'other'
      )
    ),
  add column if not exists summary text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists knowledge_sources_catalog_idx
  on public.knowledge_sources (tenant_id, catalog)
  where deleted_at is null;

create index if not exists knowledge_sources_metadata_gin_idx
  on public.knowledge_sources using gin (metadata);

create table if not exists public.source_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists source_tags_tenant_id_idx on public.source_tags (tenant_id);

create table if not exists public.knowledge_source_tags (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  tag_id uuid not null references public.source_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_id, tag_id)
);

create index if not exists knowledge_source_tags_tag_id_idx
  on public.knowledge_source_tags (tag_id);

alter table public.source_tags enable row level security;
alter table public.knowledge_source_tags enable row level security;

create policy source_tags_select_member
  on public.source_tags for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy source_tags_insert_editors
  on public.source_tags for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = source_tags.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy knowledge_source_tags_select_member
  on public.knowledge_source_tags for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy knowledge_source_tags_insert_editors
  on public.knowledge_source_tags for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = knowledge_source_tags.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
    and exists (
      select 1 from public.knowledge_sources ks
      where ks.id = knowledge_source_tags.source_id
        and ks.tenant_id = knowledge_source_tags.tenant_id
        and ks.deleted_at is null
    )
  );

create policy knowledge_source_tags_delete_editors
  on public.knowledge_source_tags for delete to authenticated
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = knowledge_source_tags.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

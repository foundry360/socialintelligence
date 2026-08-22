-- Sources scoped to individual missions (not shared across all missions)

create table if not exists public.mission_sources (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (mission_id, source_id)
);

create index if not exists mission_sources_mission_id_idx
  on public.mission_sources (mission_id);
create index if not exists mission_sources_source_id_idx
  on public.mission_sources (source_id);
create index if not exists mission_sources_tenant_id_idx
  on public.mission_sources (tenant_id);

alter table public.mission_sources enable row level security;

create policy mission_sources_select_member
  on public.mission_sources for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy mission_sources_insert_editors
  on public.mission_sources for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = mission_sources.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
    and exists (
      select 1 from public.missions ms
      where ms.id = mission_sources.mission_id
        and ms.tenant_id = mission_sources.tenant_id
        and ms.deleted_at is null
    )
    and exists (
      select 1 from public.knowledge_sources ks
      where ks.id = mission_sources.source_id
        and ks.tenant_id = mission_sources.tenant_id
        and ks.deleted_at is null
    )
  );

create policy mission_sources_delete_editors
  on public.mission_sources for delete to authenticated
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = mission_sources.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

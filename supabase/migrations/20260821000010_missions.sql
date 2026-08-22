-- Topic-scoped missions (one grounded chat per mission)

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  description text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists missions_tenant_id_idx on public.missions (tenant_id);
create index if not exists missions_tenant_updated_idx
  on public.missions (tenant_id, updated_at desc)
  where deleted_at is null;

create table if not exists public.mission_messages (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mission_messages_mission_id_idx
  on public.mission_messages (mission_id, created_at);
create index if not exists mission_messages_tenant_id_idx
  on public.mission_messages (tenant_id);

create trigger missions_set_updated_at
before update on public.missions
for each row execute function public.set_updated_at();

alter table public.missions enable row level security;
alter table public.mission_messages enable row level security;

create policy missions_select_member
  on public.missions for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy missions_insert_editors
  on public.missions for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = missions.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy missions_update_editors
  on public.missions for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and deleted_at is null
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = missions.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy mission_messages_select_member
  on public.mission_messages for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy mission_messages_insert_editors
  on public.mission_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = mission_messages.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
    and exists (
      select 1 from public.missions ms
      where ms.id = mission_messages.mission_id
        and ms.tenant_id = mission_messages.tenant_id
        and ms.deleted_at is null
    )
  );

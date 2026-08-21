-- Phase 2: personas, terminology, knowledge sources + chunks (FTS for MVP retrieval)

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  title_patterns jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  pains jsonb not null default '[]'::jsonb,
  language_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists personas_tenant_id_idx on public.personas (tenant_id);

create table if not exists public.terminology_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  preferred_term text not null,
  avoid_terms jsonb not null default '[]'::jsonb,
  definition text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists terminology_entries_tenant_id_idx
  on public.terminology_entries (tenant_id);

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  workspace_id uuid references public.knowledge_workspaces (id) on delete set null,
  title text not null,
  source_type text not null check (source_type in ('note', 'url', 'upload')),
  body text not null default '',
  url text,
  sensitivity text not null default 'internal'
    check (sensitivity in ('public', 'internal', 'confidential')),
  evidence_status text not null default 'pending'
    check (evidence_status in ('pending', 'accepted', 'rejected')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists knowledge_sources_tenant_id_idx
  on public.knowledge_sources (tenant_id);
create index if not exists knowledge_sources_evidence_idx
  on public.knowledge_sources (tenant_id, evidence_status)
  where deleted_at is null;

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  -- Full-text search vector (pgvector embeddings can be added later)
  fts tsvector generated always as (
    to_tsvector('english', coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);

create index if not exists knowledge_chunks_tenant_id_idx
  on public.knowledge_chunks (tenant_id);
create index if not exists knowledge_chunks_fts_idx
  on public.knowledge_chunks using gin (fts);

create or replace function public.is_tenant_editor(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.tenant_id = p_tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'editor')
  );
$$;

revoke all on function public.is_tenant_editor(uuid) from public;
grant execute on function public.is_tenant_editor(uuid) to authenticated;

create trigger personas_set_updated_at
before update on public.personas
for each row execute function public.set_updated_at();

create trigger terminology_entries_set_updated_at
before update on public.terminology_entries
for each row execute function public.set_updated_at();

create trigger knowledge_sources_set_updated_at
before update on public.knowledge_sources
for each row execute function public.set_updated_at();

alter table public.personas enable row level security;
alter table public.terminology_entries enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;

create policy personas_select_member on public.personas
  for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy personas_write_editors on public.personas
  for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

create policy terminology_select_member on public.terminology_entries
  for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy terminology_write_editors on public.terminology_entries
  for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

create policy knowledge_sources_select_member on public.knowledge_sources
  for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy knowledge_sources_write_editors on public.knowledge_sources
  for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

create policy knowledge_chunks_select_member on public.knowledge_chunks
  for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy knowledge_chunks_write_editors on public.knowledge_chunks
  for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

-- Allow editors to update company profile / capabilities / POVs more completely
drop policy if exists company_profiles_update_editors on public.company_profiles;
create policy company_profiles_update_editors
  on public.company_profiles for update to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

drop policy if exists capabilities_insert_editors on public.capabilities;
create policy capabilities_all_editors
  on public.capabilities for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

drop policy if exists points_of_view_insert_editors on public.points_of_view;
create policy points_of_view_all_editors
  on public.points_of_view for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

-- Search accepted evidence chunks for a tenant (security definer; checks membership)
create or replace function public.search_knowledge_chunks(
  p_tenant_id uuid,
  p_query text,
  p_limit int default 8
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_title text,
  chunk_index int,
  content text,
  rank real
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_tenant_member(p_tenant_id) then
    raise exception 'not a tenant member';
  end if;

  return query
  select
    c.id as chunk_id,
    c.source_id,
    s.title as source_title,
    c.chunk_index,
    c.content,
    ts_rank(c.fts, websearch_to_tsquery('english', p_query)) as rank
  from public.knowledge_chunks c
  join public.knowledge_sources s on s.id = c.source_id
  where c.tenant_id = p_tenant_id
    and s.deleted_at is null
    and s.evidence_status = 'accepted'
    and s.sensitivity <> 'confidential'
    and (
      p_query is null
      or length(trim(p_query)) = 0
      or c.fts @@ websearch_to_tsquery('english', p_query)
    )
  order by rank desc nulls last, c.chunk_index asc
  limit greatest(1, least(p_limit, 20));
end;
$$;

revoke all on function public.search_knowledge_chunks(uuid, text, int) from public;
grant execute on function public.search_knowledge_chunks(uuid, text, int) to authenticated;

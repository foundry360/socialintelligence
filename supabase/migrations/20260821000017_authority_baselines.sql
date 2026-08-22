-- Versioned Authority Baselines (Phase 3)

create table if not exists public.authority_baselines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  workspace_id uuid references public.knowledge_workspaces (id) on delete set null,
  version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'awaiting_approval', 'approved', 'rejected', 'superseded')),
  summary text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  pov_coverage_notes text not null default '',
  trust_mix_notes text not null default '',
  recommended_actions jsonb not null default '[]'::jsonb,
  citation_source_ids uuid[] not null default '{}',
  generated_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, version)
);

create index if not exists authority_baselines_tenant_id_idx
  on public.authority_baselines (tenant_id);

create index if not exists authority_baselines_tenant_status_idx
  on public.authority_baselines (tenant_id, status, version desc)
  where deleted_at is null;

create unique index if not exists authority_baselines_one_current_approved_idx
  on public.authority_baselines (tenant_id)
  where status = 'approved' and deleted_at is null;

create trigger authority_baselines_set_updated_at
before update on public.authority_baselines
for each row execute function public.set_updated_at();

alter table public.authority_baselines enable row level security;

create policy authority_baselines_select_member
  on public.authority_baselines for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy authority_baselines_insert_editors
  on public.authority_baselines for insert to authenticated
  with check (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = authority_baselines.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

create policy authority_baselines_update_editors
  on public.authority_baselines for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and deleted_at is null
    and exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = authority_baselines.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'editor')
    )
  );

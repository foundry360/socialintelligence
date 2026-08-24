-- Phase 2 signaling: ingestion run audit table

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  watch_profile_id uuid references public.watch_profiles (id) on delete set null,
  status text not null default 'running' check (
    status in ('running', 'completed', 'failed')
  ),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_runs_tenant_started_idx
  on public.ingestion_runs (tenant_id, started_at desc);

create index if not exists ingestion_runs_profile_started_idx
  on public.ingestion_runs (watch_profile_id, started_at desc)
  where watch_profile_id is not null;

alter table public.ingestion_runs enable row level security;

create policy ingestion_runs_select_member
  on public.ingestion_runs for select to authenticated
  using (public.is_tenant_member(tenant_id));

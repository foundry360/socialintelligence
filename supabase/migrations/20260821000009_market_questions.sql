-- Market questions & conversations for structured knowledge

create table if not exists public.market_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  question text not null,
  persona_id uuid references public.personas (id) on delete set null,
  topic text not null default '',
  buying_stage text not null
    check (buying_stage in (
      'awareness',
      'consideration',
      'decision',
      'retention'
    )),
  priority text not null
    check (priority in ('high', 'medium', 'low')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists market_questions_tenant_id_idx
  on public.market_questions (tenant_id);

create index if not exists market_questions_org_idx
  on public.market_questions (tenant_id, persona_id, topic, buying_stage, priority);

create trigger market_questions_set_updated_at
before update on public.market_questions
for each row execute function public.set_updated_at();

alter table public.market_questions enable row level security;

create policy market_questions_select_member on public.market_questions
  for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy market_questions_all_editors on public.market_questions
  for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

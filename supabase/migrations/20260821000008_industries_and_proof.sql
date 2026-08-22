-- Industries & markets + proof/evidence for structured knowledge

create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists industries_tenant_id_idx on public.industries (tenant_id);

create table if not exists public.proof_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  proof_type text not null
    check (proof_type in (
      'case_study',
      'customer_outcome',
      'success_story',
      'certification',
      'award',
      'partnership',
      'relevant_experience',
      'statistic',
      'research',
      'proprietary_framework',
      'testimonial'
    )),
  title text not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists proof_items_tenant_id_idx on public.proof_items (tenant_id);
create index if not exists proof_items_type_idx
  on public.proof_items (tenant_id, proof_type);

create trigger industries_set_updated_at
before update on public.industries
for each row execute function public.set_updated_at();

create trigger proof_items_set_updated_at
before update on public.proof_items
for each row execute function public.set_updated_at();

alter table public.industries enable row level security;
alter table public.proof_items enable row level security;

create policy industries_select_member on public.industries
  for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy industries_all_editors on public.industries
  for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

create policy proof_items_select_member on public.proof_items
  for select to authenticated
  using (public.is_tenant_member(tenant_id) and deleted_at is null);

create policy proof_items_all_editors on public.proof_items
  for all to authenticated
  using (public.is_tenant_editor(tenant_id))
  with check (public.is_tenant_editor(tenant_id));

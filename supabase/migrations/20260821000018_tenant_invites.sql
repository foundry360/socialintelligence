-- Pending team invites + admin membership management helpers

create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (tenant_id, email)
);

create index if not exists tenant_invites_tenant_id_idx
  on public.tenant_invites (tenant_id);

create index if not exists tenant_invites_email_idx
  on public.tenant_invites (lower(email))
  where accepted_at is null;

create or replace function public.is_tenant_admin(p_tenant_id uuid)
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
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_tenant_admin(uuid) from public;
grant execute on function public.is_tenant_admin(uuid) to authenticated;

alter table public.tenant_invites enable row level security;

create policy tenant_invites_select_admin
  on public.tenant_invites for select to authenticated
  using (public.is_tenant_admin(tenant_id));

create policy tenant_memberships_update_admin
  on public.tenant_memberships for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy tenant_memberships_delete_admin
  on public.tenant_memberships for delete to authenticated
  using (
    public.is_tenant_admin(tenant_id)
    and user_id <> auth.uid()
    and role <> 'owner'
  );

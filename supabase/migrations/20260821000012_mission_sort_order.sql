-- Manual sort order for mission cards on the dashboard

alter table public.missions
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by tenant_id
      order by created_at asc, id asc
    ) - 1 as rn
  from public.missions
  where deleted_at is null
)
update public.missions m
set sort_order = ranked.rn
from ranked
where m.id = ranked.id;

create index if not exists missions_tenant_sort_order_idx
  on public.missions (tenant_id, sort_order)
  where deleted_at is null;

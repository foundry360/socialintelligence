-- Assignable project lead per mission

alter table public.missions
  add column if not exists project_lead_id uuid references auth.users (id) on delete set null;

create index if not exists missions_project_lead_id_idx
  on public.missions (project_lead_id)
  where deleted_at is null;
